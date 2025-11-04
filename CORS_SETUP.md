# Setting Up CORS for Google Cloud Storage

The "Failed to fetch" error when saving resource content is caused by CORS (Cross-Origin Resource Sharing) not being configured on your Google Cloud Storage bucket.

## Quick Fix

1. **Find your bucket name** - Check your backend `.env` file for `FILE_UPLOADING_GCS_BUCKET_NAME`

2. **Apply CORS configuration** using the `gcloud` CLI:
   ```bash
   gcloud storage buckets update gs://[YOUR_BUCKET_NAME] --cors-file=cors.json
   ```
   
   Replace `[YOUR_BUCKET_NAME]` with your actual bucket name.

3. **If you don't have `gcloud` CLI installed:**
   - Install: https://cloud.google.com/sdk/docs/install
   - Authenticate: `gcloud auth login`
   - Set project: `gcloud config set project YOUR_PROJECT_ID`

4. **Verify CORS is configured:**
   ```bash
   gcloud storage buckets describe gs://[YOUR_BUCKET_NAME] --format="json" | grep -A 10 cors
   ```

## Alternative: Check Browser Console

Open your browser's developer console (F12) and look for:
- Red error messages about CORS
- The detailed error logs we've added (look for "Failed to upload to presigned URL")
- Check if the origins match (frontend origin vs upload URL origin)

## Testing

After configuring CORS, try saving a resource again. The upload should work.

If you still get errors:
1. Check the browser console for detailed error messages
2. Verify the CORS configuration includes your frontend origin (http://localhost:5173)
3. Make sure you've restarted your backend after any changes

