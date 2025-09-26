import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { fileName, bucketName = 'json-exports' } = await req.json()

    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'fileName is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the service account key from Supabase secrets
    const serviceAccountKey = Deno.env.get('SERVICE_ACCOUNT_KEY')
    if (!serviceAccountKey) {
      throw new Error('SERVICE_ACCOUNT_KEY not found in secrets')
    }

    // Parse the service account key - expect full JSON service account file
    let serviceAccount
    try {
      serviceAccount = JSON.parse(serviceAccountKey)
    } catch (error) {
      throw new Error('SERVICE_ACCOUNT_KEY must be a valid JSON service account file, not just the private key. Please upload the complete service account JSON file.')
    }
    
    // Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(fileName)

    if (downloadError) {
      throw new Error(`Failed to download file from Supabase: ${downloadError.message}`)
    }

    // Convert file data to array buffer
    const fileBuffer = await fileData.arrayBuffer()

    // Create JWT token for GCP authentication
    const now = Math.floor(Date.now() / 1000)
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    }

    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    }

    // Import the private key (PKCS8 DER from PEM)
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
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    )

    // Create JWT
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

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    })

    const tokenData = await tokenResponse.json()
    
    if (!tokenData.access_token) {
      throw new Error('Failed to get access token from Google')
    }

    // Upload file to GCP Storage
    const gcpBucketName = 'jasoner'
    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${gcpBucketName}/o?uploadType=media&name=${encodeURIComponent(fileName)}`
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: fileBuffer
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      throw new Error(`GCP upload failed: ${uploadResponse.status} ${errorText}`)
    }

    const uploadResult = await uploadResponse.json()
    
    console.log(`Successfully synced ${fileName} to GCP bucket: gs://${gcpBucketName}/${fileName}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        gcpPath: `gs://${gcpBucketName}/${fileName}`,
        gcpObject: uploadResult
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('GCP sync error:', error)
    const msg = (error as any)?.message || String(error)
    return new Response(
      JSON.stringify({ error: msg }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})