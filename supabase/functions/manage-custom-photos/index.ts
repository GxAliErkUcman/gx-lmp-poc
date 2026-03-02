import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const GCP_BUCKET = 'jasoner'
const BASE_PREFIX = 'Custom Photos'
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

    const { action, clientName, storeCode, fileData, fileExtension, objectName } = await req.json()

    if (!clientName || !storeCode) {
      return new Response(JSON.stringify({ success: false, error: 'clientName and storeCode are required' }), {
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
        .filter((item: any) => !item.name.endsWith('/')) // skip folder markers
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
