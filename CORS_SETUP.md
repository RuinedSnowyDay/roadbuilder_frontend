# Setting Up CORS for Google Cloud Storage

CORS (Cross-Origin Resource Sharing) errors occur when the frontend tries to upload files to or download files from Google Cloud Storage. This affects both:
- **Uploads**: When saving resource content
- **Downloads**: When loading resource content (the error you're seeing on Render)

## Quick Fix

1. **Find your bucket name** - Check your backend `.env` file for `FILE_UPLOADING_GCS_BUCKET_NAME`

2. **Update `cors.json`** to include your Render frontend domain:
   - Open `cors.json` in this directory
   - Add your Render frontend URL to the `origin` array (e.g., `https://your-app.onrender.com`)
   - Keep localhost URLs for local development

3. **Apply CORS configuration** using the `gcloud` CLI:
   ```bash
   gcloud storage buckets update gs://[YOUR_BUCKET_NAME] --cors-file=cors.json
   ```
   
   Replace `[YOUR_BUCKET_NAME]` with your actual bucket name.

4. **If you don't have `gcloud` CLI installed:**
   - Install: https://cloud.google.com/sdk/docs/install
   - Authenticate: `gcloud auth login`
   - Set project: `gcloud config set project YOUR_PROJECT_ID`

5. **Verify CORS is configured:**
   ```bash
   gcloud storage buckets describe gs://[YOUR_BUCKET_NAME] --format="json" | grep -A 10 cors
   ```

## Alternative: Using Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/storage/browser)
2. Select your bucket
3. Click on the **Configuration** tab
4. Scroll to **CORS** section
5. Click **Edit CORS configuration**
6. Paste the contents of `cors.json` (with your Render URL added)
7. Click **Save**

## Testing

After configuring CORS:
- **Local development**: Try saving/loading a resource at http://localhost:5173
- **Production**: Try loading a resource on your Render deployment

If you still get errors:
1. Check the browser console for detailed error messages
2. Verify the CORS configuration includes your frontend origin (both localhost and Render URL)
3. Make sure you've applied the CORS configuration to the bucket
4. Wait a few minutes for CORS changes to propagate

