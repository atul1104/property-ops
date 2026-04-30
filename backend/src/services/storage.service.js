const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET = 'leases';

/**
 * Upload a PDF buffer to Supabase Storage.
 * Returns the storageKey (path inside the bucket).
 */
const uploadPdf = async (buffer, originalFilename) => {
  const sanitized = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageKey = `leases/${Date.now()}_${sanitized}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storageKey, buffer, { contentType: 'application/pdf', upsert: false });

  if (error) {
    throw Object.assign(new Error(`Supabase upload failed: ${error.message}`), { status: 500 });
  }

  return storageKey;
};

/**
 * Download a PDF from Supabase Storage by storageKey.
 * Returns a Buffer.
 */
const downloadPdf = async (storageKey) => {
  const { data, error } = await supabase.storage.from(BUCKET).download(storageKey);

  if (error) {
    throw Object.assign(new Error(`Supabase download failed: ${error.message}`), { status: 500 });
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const deletePdf = async (storageKey) => {
  const { error } = await supabase.storage.from(BUCKET).remove([storageKey]);
  if (error) throw Object.assign(new Error(`Supabase delete failed: ${error.message}`), { status: 500 });
};

module.exports = { uploadPdf, downloadPdf, deletePdf };
