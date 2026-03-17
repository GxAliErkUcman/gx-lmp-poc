import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const GCP_BUCKET = 'jasoner'
const BASE_PREFIX = 'Other Photos'
const MAX_PHOTOS = 10

async function getGcpAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }

  const privateKeyPem = serviceAccount.private_key as string
  const pemBody = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const binaryDer = atob(pemBody)
  const derBytes = new Uint8Array(binaryDer.length)
  for (let i = 0; i < binaryDer.length; i++) {
    derBytes[i] = binaryDer.charCodeAt(i)
  }

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    derBytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const unsignedToken = `${headerB64}.${payloadB64}`

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(unsignedToken)
  )

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const jwt = `${unsignedToken}.${signatureB64}`

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  })

  const tokenData = await tokenResponse.json()
  if (!tokenData.access_token) {
    throw new Error('Failed to get access token from Google')
  }
  return tokenData.access_token
}

function buildPrefix(clientName: string, storeCode: string): string {
  return `${BASE_PREFIX}/${clientName}/${storeCode}/`
}

async function syncOtherPhotosToDb(accessToken: string, prefix: string, storeCode: string, clientName: string) {
  try {
    // List all current photos in GCP
    const listUrl = `https://storage.googleapis.com/storage/v1/b/${GCP_BUCKET}/o?prefix=${encodeURIComponent(prefix)}&maxResults=50`
    const listResponse = await fetch(listUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    const listData = await listResponse.json()
    const items = (listData.items || []).filter((item: any) => !item.name.endsWith('/'))

    // Build public URLs
    const urls = items.map((item: any) =>
      `https://storage.googleapis.com/${GCP_BUCKET}/${encodeURIComponent(item.name).replace(/%2F/g, '/')}`
    )

    // Use service role client to update
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Find target clients by name
    const { data: clients } = await serviceClient
      .from('clients')
      .select('id')
      .eq('name', clientName)

    if (!clients || clients.length === 0) {
      console.warn(`syncOtherPhotosToDb: client not found for name=${clientName}`)
      return
    }

    const clientIds = clients.map((c: any) => c.id)

    // Find exact businesses for this storeCode under those clients
    const { data: matchedBusinesses, error: matchError } = await serviceClient
      .from('businesses')
      .select('id, client_id')
      .eq('storeCode', storeCode)
      .in('client_id', clientIds)

    if (matchError) {
      console.error('syncOtherPhotosToDb match error:', matchError)
      return
    }

    if (!matchedBusinesses || matchedBusinesses.length === 0) {
      console.warn(`syncOtherPhotosToDb: no businesses matched storeCode=${storeCode}, clientName=${clientName}`)
      return
    }

    const businessIds = matchedBusinesses.map((b: any) => b.id)
    const targetClientIds = Array.from(new Set(matchedBusinesses.map((b: any) => b.client_id)))

    const { error } = await serviceClient
      .from('businesses')
      .update({ otherPhotos: urls.length > 0 ? urls.join(', ') : null })
      .in('id', businessIds)

    if (error) {
      console.error('syncOtherPhotosToDb update error:', error)
      return
    }

    console.log(`Synced ${urls.length} other photo URL(s) to DB for ${storeCode}`)

    // Regenerate JSON exports for affected clients so file reflects latest otherPhotos
    for (const clientId of targetClientIds) {
      try {
        const exportRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-json-export`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ client_id: clientId })
        })

        if (!exportRes.ok) {
          const body = await exportRes.text()
          console.warn(`syncOtherPhotosToDb export refresh failed for client ${clientId}: ${exportRes.status} ${body}`)
        } else {
          console.log(`Refreshed JSON export for client ${clientId}`)
        }
      } catch (exportErr) {
        console.warn(`syncOtherPhotosToDb export refresh error for client ${clientId}:`, exportErr)
      }
    }
  } catch (err) {
    console.error('syncOtherPhotosToDb error:', err)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { action, clientName, storeCode, fileData, fileExtension, objectName } = body ?? {}

    // Input validation
    const validActions = ['list', 'upload', 'delete']
    if (!action || typeof action !== 'string' || !validActions.includes(action)) {
      return new Response(JSON.stringify({ success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!clientName || typeof clientName !== 'string' || clientName.length > 255 || clientName.includes('..') || clientName.includes('/')) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid or missing clientName' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!storeCode || typeof storeCode !== 'string' || storeCode.length > 255 || storeCode.includes('..') || storeCode.includes('/')) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid or missing storeCode' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (fileExtension !== undefined) {
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'tiff', 'bmp']
      if (typeof fileExtension !== 'string' || !allowedExtensions.includes(fileExtension.toLowerCase())) {
        return new Response(JSON.stringify({ success: false, error: `Invalid fileExtension. Allowed: ${allowedExtensions.join(', ')}` }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }
    if (objectName !== undefined && (typeof objectName !== 'string' || objectName.length > 1000 || objectName.includes('..'))) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid objectName' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const serviceAccountKey = Deno.env.get('SERVICE_ACCOUNT_KEY')
    if (!serviceAccountKey) {
      throw new Error('SERVICE_ACCOUNT_KEY not found')
    }

    const serviceAccount = JSON.parse(serviceAccountKey)
    const accessToken = await getGcpAccessToken(serviceAccount)
    const prefix = buildPrefix(clientName, storeCode)

    if (action === 'list') {
      const listUrl = `https://storage.googleapis.com/storage/v1/b/${GCP_BUCKET}/o?prefix=${encodeURIComponent(prefix)}&maxResults=50`
      const listResponse = await fetch(listUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })

      if (!listResponse.ok) {
        const errText = await listResponse.text()
        throw new Error(`GCP list failed: ${listResponse.status} ${errText}`)
      }

      const listData = await listResponse.json()
      const items = (listData.items || [])
        .filter((item: any) => !item.name.endsWith('/'))
        .map((item: any) => ({
          name: item.name,
          url: `https://storage.googleapis.com/storage/v1/b/${GCP_BUCKET}/o/${encodeURIComponent(item.name)}?alt=media&access_token=${accessToken}`,
          size: parseInt(item.size || '0'),
          created: item.timeCreated,
        }))

      return new Response(JSON.stringify({ success: true, photos: items }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (action === 'upload') {
      if (!fileData || !fileExtension) {
        return new Response(JSON.stringify({ success: false, error: 'fileData and fileExtension are required' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Check current count
      const listUrl = `https://storage.googleapis.com/storage/v1/b/${GCP_BUCKET}/o?prefix=${encodeURIComponent(prefix)}&maxResults=50`
      const listResponse = await fetch(listUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      const listData = await listResponse.json()
      const existingCount = (listData.items || []).filter((i: any) => !i.name.endsWith('/')).length

      if (existingCount >= MAX_PHOTOS) {
        return new Response(JSON.stringify({ success: false, error: `Maximum ${MAX_PHOTOS} custom photos allowed per location` }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Decode base64
      const binaryStr = atob(fileData)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i)
      }

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExtension}`
      const objectPath = `${prefix}${fileName}`

      // Determine content type
      const contentTypeMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'tiff': 'image/tiff',
        'bmp': 'image/bmp',
      }
      const contentType = contentTypeMap[fileExtension.toLowerCase()] || 'application/octet-stream'

      const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${GCP_BUCKET}/o?uploadType=media&name=${encodeURIComponent(objectPath)}`
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': contentType,
        },
        body: bytes.buffer,
      })

      if (!uploadResponse.ok) {
        const errText = await uploadResponse.text()
        throw new Error(`GCP upload failed: ${uploadResponse.status} ${errText}`)
      }

      const uploadResult = await uploadResponse.json()
      const publicUrl = `https://storage.googleapis.com/${GCP_BUCKET}/${encodeURIComponent(objectPath).replace(/%2F/g, '/')}`

      console.log(`Uploaded custom photo: gs://${GCP_BUCKET}/${objectPath}`)

      // Sync to DB
      await syncOtherPhotosToDb(accessToken, prefix, storeCode, clientName)

      return new Response(JSON.stringify({ success: true, url: publicUrl, objectName: objectPath }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (action === 'delete') {
      if (!objectName) {
        return new Response(JSON.stringify({ success: false, error: 'objectName is required for delete' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Security: ensure the object belongs to the expected prefix
      if (!objectName.startsWith(prefix)) {
        return new Response(JSON.stringify({ success: false, error: 'Cannot delete objects outside the location folder' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const deleteUrl = `https://storage.googleapis.com/storage/v1/b/${GCP_BUCKET}/o/${encodeURIComponent(objectName)}`
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })

      if (deleteResponse.ok || deleteResponse.status === 404) {
        console.log(`Deleted custom photo: gs://${GCP_BUCKET}/${objectName}`)

        // Sync to DB
        await syncOtherPhotosToDb(accessToken, prefix, storeCode, clientName)

        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const errText = await deleteResponse.text()
      throw new Error(`GCP delete failed: ${deleteResponse.status} ${errText}`)

    } else {
      return new Response(JSON.stringify({ success: false, error: 'Invalid action. Use: list, upload, delete' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('manage-custom-photos error:', error)
    return new Response(JSON.stringify({ success: false, error: (error as any)?.message || String(error) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
