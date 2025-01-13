const express = require('express');
const cors = require('cors');
const { InfluxDB } = require('@influxdata/influxdb-client');
const app = express();
const port = process.env.PORT || 5000;

// ตั้งค่าการเชื่อมต่อ InfluxDB
const token = 'iTtQKjM3QxQhNh_Xg426FTyVPtJt01Np9yDhlulPLoUQOUX37u-86DI8v_GePqCeH4Es2gVOfaZP9ej1NQKv5Q==';
const org = 'sensor';
const bucket = 'trytwo';
const url = 'http://localhost:8086'; // URL ของ InfluxDB Server

const queryApi = new InfluxDB({ url, token }).getQueryApi(org);

// เปิดใช้งาน CORS เพื่อแก้ไขปัญหา Cross-Origin Resource Sharing
app.use(cors());

// Query เพื่อดึงข้อมูลจาก InfluxDB
const query = `from(bucket: "${bucket}")
  |> range(start: 2024-01-10T14:59:57Z, stop: 2024-04-30T14:59:57Z) 
  |> filter(fn: (r) => r._measurement == "airSensors")
  |> filter(fn: (r) => r._field == "co" or r._field == "humidity" or r._field == "temperature")
  |> filter(fn: (r) => r.sensor_id == "TLM100" or r.sensor_id == "TLM200")`;

// Route สำหรับดึงข้อมูลจาก InfluxDB
app.get('/combined-data', async (req, res) => {
    try {
        const influxData = [];

        queryApi.queryRows(query, {
            next(row, tableMeta) {
                const data = tableMeta.toObject(row);
                influxData.push(data);
            },
            error(error) {
                console.error('InfluxDB Query Error:', error);
                res.status(500).json({ error: 'Error fetching data from InfluxDB', details: error.message });
            },
            complete() {
                console.log('Data from InfluxDB fetched successfully.');
                // ส่งกลับข้อมูล InfluxDB
                res.json({ influxData });
            },
        });
    } catch (error) {
        console.error('Unexpected Error:', error.message);
        res.status(500).json({ error: 'Unexpected error occurred', details: error.message });
    }
});

// เริ่มเซิร์ฟเวอร์
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
