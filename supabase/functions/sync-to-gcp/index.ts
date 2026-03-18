import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BBRAUN_CLIENT_ID = '928eff66-e4c2-42f2-a092-2986cab5733b';

async function logExecution(
  supabase: any,
  status: 'success' | 'error',
  requestBody: any,
  startTime: number,
  errorMessage?: string,
  responseBody?: any
) {
  try {
    await supabase.from('edge_function_logs').insert({
      function_name: 'sync-to-gcp',
      status,
      request_body: requestBody,
      response_body: responseBody || null,
      error_message: errorMessage || null,
      duration_ms: Date.now() - startTime,
    });
  } catch (e) {
    console.warn('Failed to write execution log:', e);
  }
}

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

  const startTime = Date.now();
  let requestBody: any = {};

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { fileName, bucketName = 'json-exports', clientId } = body ?? {}
    requestBody = { fileName, bucketName, clientId };

    // Input validation
    if (!fileName || typeof fileName !== 'string' || fileName.length > 500) {
      return new Response(
        JSON.stringify({ error: 'fileName is required and must be a string (max 500 chars)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (fileName.includes('..') || fileName.includes('\\')) {
      return new Response(
        JSON.stringify({ error: 'Invalid fileName: path traversal not allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const allowedBuckets = ['json-exports', 'json-backups']
    if (typeof bucketName !== 'string' || !allowedBuckets.includes(bucketName)) {
      return new Response(
        JSON.stringify({ error: `Invalid bucketName. Allowed: ${allowedBuckets.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (clientId !== undefined && (typeof clientId !== 'string' || clientId.length > 255)) {
      return new Response(
        JSON.stringify({ error: 'Invalid clientId' }),
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

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(fileName)

    if (downloadError) {
      throw new Error(`Failed to download file from Supabase: ${downloadError.message}`)
    }

    const fileBuffer = await fileData.arrayBuffer()
    const accessToken = await getGcpAccessToken(serviceAccount)
    const gcpBucketName = 'jasoner'

    await deleteFromGcp(accessToken, gcpBucketName, fileName)
    const uploadResult = await uploadToGcp(accessToken, gcpBucketName, fileName, fileBuffer)
    console.log(`Successfully synced ${fileName} to GCP bucket: gs://${gcpBucketName}/${fileName}`)

    let bbraunCopyPath: string | null = null
    if (clientId === BBRAUN_CLIENT_ID) {
      bbraunCopyPath = `Bbraun Export Copy/${fileName}`
      await deleteFromGcp(accessToken, gcpBucketName, bbraunCopyPath)
      await uploadToGcp(accessToken, gcpBucketName, bbraunCopyPath, fileBuffer)
      console.log(`BBraun extra copy uploaded: gs://${gcpBucketName}/${bbraunCopyPath}`)
    }

    const responseBody = {
      success: true,
      gcpPath: `gs://${gcpBucketName}/${fileName}`,
      gcpObject: uploadResult,
      ...(bbraunCopyPath ? { bbraunCopyPath: `gs://${gcpBucketName}/${bbraunCopyPath}` } : {})
    };

    await logExecution(supabase, 'success', requestBody, startTime, undefined, responseBody);

    return new Response(
      JSON.stringify(responseBody),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('GCP sync error:', error)
    const msg = (error as any)?.message || String(error)
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await logExecution(supabase, 'error', requestBody, startTime, msg);
    } catch (_) { /* ignore */ }
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
