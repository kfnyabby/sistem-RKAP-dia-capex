const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const BENCHMARK_FILE = path.join(__dirname, '../uploads/benchmark_600k.xlsx');
const TOTAL_ROWS = 600000;

function formatMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

async function runBenchmark() {
  console.log('====================================================');
  console.log(`BENCHMARK STREAMING REALISASI (${TOTAL_ROWS.toLocaleString()} BARIS)`);
  console.log('====================================================');

  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // 1. GENERATE FILE 600k BARIS VIA STREAMING WORKBOOK WRITER
  console.log('\n[1/3] Menghasilkan file Excel 600.000 baris streaming...');
  const genStart = Date.now();

  const writeStream = fs.createWriteStream(BENCHMARK_FILE);
  const workbookWriter = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: writeStream,
    useStyles: false,
    useSharedStrings: false,
  });

  const worksheet = workbookWriter.addWorksheet('DAFTAR_JURNAL');
  worksheet.addRow([
    'TANGGAL',
    'ID SUB JURNAL',
    'IDGL',
    'KODE COA',
    'NAMA COA',
    'UNIT',
    'DEBET',
    'KREDIT',
    'KETERANGAN',
  ]);

  for (let i = 1; i <= TOTAL_ROWS; i++) {
    const sjId = `SJ-202610-${i}`;
    const idgl = `GL-${i % 10000}`;
    const coaCode = i % 10 === 0 ? '1.1.1.01' : i % 5 === 0 ? '1.2.1.1.4' : '5.2.4';
    const coaName = i % 10 === 0 ? 'Kas' : i % 5 === 0 ? 'Aset Tetap' : 'Biaya Suku Cadang';
    const unit = i % 4 === 0 ? 'LABORATORIUM [9920]' : 'MCU [9910]';
    const debit = 50000 + (i % 1000) * 100;
    const credit = i % 7 === 0 ? 5000 : 0;
    const desc = i % 20 === 0 ? `Pemakaian alat (101) baris ${i}` : `Transaksi realisasi rutin ${i}`;

    const row = worksheet.addRow([
      '2026-10-15',
      sjId,
      idgl,
      coaCode,
      coaName,
      unit,
      debit,
      credit,
      desc,
    ]);
    row.commit();

    if (i % 100000 === 0) {
      console.log(`  > Dihasilkan ${i.toLocaleString()} baris...`);
    }
  }

  worksheet.commit();
  await workbookWriter.commit();

  const genDuration = ((Date.now() - genStart) / 1000).toFixed(2);
  const fileStats = fs.statSync(BENCHMARK_FILE);
  const fileSizeMB = formatMB(fileStats.size);
  console.log(`✓ Pembuatan file selesai dalam ${genDuration}s (${fileSizeMB} MB)`);

  // 2. STREAMING READ & PROCESS SIMULATION
  console.log('\n[2/3] Membaca streaming & memproses data baris demi baris...');
  global.gc && global.gc();

  const memInitial = process.memoryUsage();
  let peakHeapUsed = memInitial.heapUsed;
  let peakRss = memInitial.rss;

  const readStart = Date.now();
  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(BENCHMARK_FILE, {
    entries: 'emit',
    sharedStrings: 'cache',
    hyperlinks: 'ignore',
    styles: 'ignore',
  });

  let headerMap = null;
  let rowsRead = 0;
  let rowsExpense = 0;
  let rowsInvestment = 0;
  let rowsSkipped = 0;

  for await (const worksheetReader of workbookReader) {
    for await (const row of worksheetReader) {
      const values = row.values;
      if (!values || !Array.isArray(values) || values.length <= 1) continue;

      if (!headerMap) {
        headerMap = new Map();
        for (let col = 1; col < values.length; col++) {
          const raw = String(values[col] || '').trim().toUpperCase();
          if (raw) headerMap.set(raw, col);
        }
        continue;
      }

      rowsRead++;

      // Simulasi ekstraksi & filter
      const coaCode = String(values[headerMap.get('KODE COA')] || '').trim();
      const isExpense = coaCode.startsWith('4') || coaCode.startsWith('5');
      const isInvestment = coaCode.startsWith('1.2.1.1.4') || coaCode.startsWith('1.2.1.1.6');

      if (!isExpense && !isInvestment) {
        rowsSkipped++;
      } else if (isExpense) {
        rowsExpense++;
      } else {
        rowsInvestment++;
      }

      // Sample memory setiap 50.000 baris
      if (rowsRead % 50000 === 0) {
        const memCurrent = process.memoryUsage();
        if (memCurrent.heapUsed > peakHeapUsed) peakHeapUsed = memCurrent.heapUsed;
        if (memCurrent.rss > peakRss) peakRss = memCurrent.rss;
        console.log(
          `  > Dibaca: ${rowsRead.toLocaleString()} | Heap: ${formatMB(memCurrent.heapUsed)} MB | RSS: ${formatMB(memCurrent.rss)} MB`
        );
      }
    }
  }

  const readDuration = ((Date.now() - readStart) / 1000).toFixed(2);
  const rowsPerSec = Math.round(rowsRead / Number(readDuration));
  const memFinal = process.memoryUsage();

  console.log('\n[3/3] Ringkasan Hasil Benchmark:');
  console.log('----------------------------------------------------');
  console.log(`- Total Baris Terbaca       : ${rowsRead.toLocaleString()}`);
  console.log(`- Baris Biaya (Expense)     : ${rowsExpense.toLocaleString()}`);
  console.log(`- Baris Investasi           : ${rowsInvestment.toLocaleString()}`);
  console.log(`- Baris Dilewati (Skipped)  : ${rowsSkipped.toLocaleString()}`);
  console.log(`- Ukuran File di Disk       : ${fileSizeMB} MB`);
  console.log(`- Durasi Streaming Baca     : ${readDuration} detik`);
  console.log(`- Throughput Pemrosesan     : ${rowsPerSec.toLocaleString()} baris/detik`);
  console.log(`- Heap Awal                 : ${formatMB(memInitial.heapUsed)} MB`);
  console.log(`- Peak Heap Digunakan       : ${formatMB(peakHeapUsed)} MB`);
  console.log(`- Heap Akhir                : ${formatMB(memFinal.heapUsed)} MB`);
  console.log(`- Peak RSS Digunakan        : ${formatMB(peakRss)} MB`);
  console.log('----------------------------------------------------');

  // Bersihkan file benchmark
  try {
    fs.unlinkSync(BENCHMARK_FILE);
    console.log('✓ File benchmark sementara telah dibersihkan.');
  } catch {
    // ignore
  }

  return {
    rowsRead,
    rowsExpense,
    rowsInvestment,
    rowsSkipped,
    fileSizeMB,
    readDuration,
    rowsPerSec,
    initialHeapMB: formatMB(memInitial.heapUsed),
    peakHeapMB: formatMB(peakHeapUsed),
    finalHeapMB: formatMB(memFinal.heapUsed),
    peakRssMB: formatMB(peakRss),
  };
}

if (require.main === module) {
  runBenchmark()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Benchmark gagal:', err);
      process.exit(1);
    });
}

module.exports = { runBenchmark };
