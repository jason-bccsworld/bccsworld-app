// Debug script to check what's actually in the database
const { Pool } = require('pg');

async function checkDocumentData() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });
  
  try {
    // Get all documents
    const docs = await pool.query('SELECT * FROM documents ORDER BY created_at DESC LIMIT 5');
    console.log('=== DOCUMENTS IN DATABASE ===');
    docs.rows.forEach(doc => {
      console.log(`ID: ${doc.id}, File: ${doc.original_name}, Status: ${doc.status}`);
    });
    
    // Get extracted data
    const extracted = await pool.query('SELECT * FROM extracted_data ORDER BY created_at DESC LIMIT 10');
    console.log('\n=== EXTRACTED DATA ===');
    extracted.rows.forEach(data => {
      console.log(`Field: ${data.field_name}, Value: ${data.extracted_value}, Doc: ${data.document_id}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkDocumentData();