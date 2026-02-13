import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// BBraun client ID - gets a second copy in a dedicated subfolder
const BBRAUN_CLIENT_ID = '928eff66-e4c2-42f2-a092-2986cab5733b';

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

// Delete a file from GCP Storage (ignore 404 errors)
async function deleteFromGcp(accessToken: string, bucketName: string, objectName: string): Promise<void> {
  const deleteUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(objectName)}`
  const deleteResponse = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })

  if (deleteResponse.ok) {
    console.log(`Deleted existing file: gs://${bucketName}/${objectName}`)
  } else if (deleteResponse.status === 404) {
    console.log(`File does not exist yet (404), skipping delete: gs://${bucketName}/${objectName}`)
  } else {
    const errorText = await deleteResponse.text()
    console.warn(`Delete failed (non-fatal): ${deleteResponse.status} ${errorText}`)
  }
}

// Upload a file to GCP Storage
async function uploadToGcp(accessToken: string, bucketName: string, objectName: string, fileBuffer: ArrayBuffer): Promise<any> {
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(objectName)}`
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: fileBuffer
  })

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text()
    throw new Error(`GCP upload failed: ${uploadResponse.status} ${errorText}`)
  }

  return await uploadResponse.json()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { fileName, bucketName = 'json-exports', clientId } = await req.json()

    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'fileName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const serviceAccountKey = Deno.env.get('SERVICE_ACCOUNT_KEY')
    if (!serviceAccountKey) {
      throw new Error('SERVICE_ACCOUNT_KEY not found in secrets')
    }

    let serviceAccount
    try {
      serviceAccount = JSON.parse(serviceAccountKey)
    } catch {
      throw new Error('SERVICE_ACCOUNT_KEY must be a valid JSON service account file.')
    }

    // Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(fileName)

    if (downloadError) {
      throw new Error(`Failed to download file from Supabase: ${downloadError.message}`)
    }

    const fileBuffer = await fileData.arrayBuffer()

    // Get GCP access token
    const accessToken = await getGcpAccessToken(serviceAccount)

    const gcpBucketName = 'jasoner'

    // Step 1: Delete existing file, then upload fresh (company practice)
    await deleteFromGcp(accessToken, gcpBucketName, fileName)
    const uploadResult = await uploadToGcp(accessToken, gcpBucketName, fileName, fileBuffer)
    console.log(`Successfully synced ${fileName} to GCP bucket: gs://${gcpBucketName}/${fileName}`)

    // Step 2: If this is BBraun, also copy to the dedicated subfolder
    let bbraunCopyPath: string | null = null
    if (clientId === BBRAUN_CLIENT_ID) {
      bbraunCopyPath = `Bbraun Export Copy/${fileName}`
      await deleteFromGcp(accessToken, gcpBucketName, bbraunCopyPath)
      await uploadToGcp(accessToken, gcpBucketName, bbraunCopyPath, fileBuffer)
      console.log(`BBraun extra copy uploaded: gs://${gcpBucketName}/${bbraunCopyPath}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        gcpPath: `gs://${gcpBucketName}/${fileName}`,
        gcpObject: uploadResult,
        ...(bbraunCopyPath ? { bbraunCopyPath: `gs://${gcpBucketName}/${bbraunCopyPath}` } : {})
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('GCP sync error:', error)
    const msg = (error as any)?.message || String(error)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
