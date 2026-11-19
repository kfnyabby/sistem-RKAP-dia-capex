const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

/**
 * Menyajikan spesifikasi OpenAPI dalam format YAML atau JSON
 */
router.get('/openapi.yaml', (req, res) => {
  const filePath = path.resolve(__dirname, '../../../docs/openapi.yaml');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Spesifikasi openapi.yaml tidak ditemukan' });
  }
  res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
  return res.sendFile(filePath);
});

router.get('/openapi.json', (req, res) => {
  const yamlPath = path.resolve(__dirname, '../../../docs/openapi.yaml');
  const jsonPath = path.resolve(__dirname, '../../../docs/openapi.json');

  if (fs.existsSync(jsonPath)) {
    return res.sendFile(jsonPath);
  }

  // Jika file json belum ada, kirim status atau baca yaml
  if (fs.existsSync(yamlPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.sendFile(yamlPath);
  }

  return res.status(404).json({ message: 'Dokumen spesifikasi OpenAPI tidak ditemukan' });
});

module.exports = router;
