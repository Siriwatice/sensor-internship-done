import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Table } from 'antd';
import {
  Box,
  Typography,
  Button,
  ButtonGroup,
  Checkbox,
  FormControlLabel,
  TextField,
  Card,
  CardContent,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { UploadOutlined, UserOutlined } from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import 'chartjs-adapter-date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import '../App.css';
import './layout.css';
import './buttonStyles.css';

// Register chart components ส่วนประกอบ chart
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

const { Header, Sider, Content } = Layout;

const Ui = () => {
  // State management
  const [data, setData] = useState([]);
  const [selectedField, setSelectedField] = useState('co');
  const [selectedSensors, setSelectedSensors] = useState(['TLM100', 'TLM200']);
  const [startDate, setStartDate] = useState('2024-01-10');
  const [endDate, setEndDate] = useState('2024-05-01');
  const [filterType, setFilterType] = useState('day');
  const [collapsed, setCollapsed] = useState(false);
  const [chartType, setChartType] = useState('line');
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:5000/combined-data');
        const result = await response.json();
        setData(result.influxData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      
    };
    fetchData();
  }, []);

  // Function to generate color ฟังก์ชั่นการสร้างสี

  const generateColor = (index) => {
    const colors = ['rgba(0, 123, 255, 1)', 'rgba(220, 53, 69, 1)', 'rgba(40, 167, 69, 1)', 'rgba(255, 193, 7, 1)'];
    return colors[index % colors.length];
  };

  // Sensor and field mappings เปลี่ยนชื่อ
  const sensorMapping = {
    TLM100: 'Sensor No.1',
    TLM200: 'Sensor No.2',
  };

  const fieldMapping = {
    co: 'CO2',
    humidity: 'Humidity',
    temperature: 'Temperature',
  };

  // Handle sensor selection เลือกเซนเซอร์ ตัวจัดการ
  const handleSensorChange = (sensor) => {
    setSelectedSensors((prev) =>
      prev.includes(sensor) ? prev.filter((s) => s !== sensor) : [...prev, sensor]
    );
  };

  // Filter data based on selected filters ฟิวเตอร์ 
  const filteredData = data.filter((item) => {
    const itemDate = new Date(item._time);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    return (
      (!start || itemDate >= start) &&
      (!end || itemDate <= end) &&
      item._field === selectedField &&
      selectedSensors.includes(item.sensor_id)
    );
  });

  // Calculate statistics คิดค่าใน card
  const maxValue = filteredData.length > 0 ? Math.max(...filteredData.map((item) => item._value)) : 'N/A';
  const minValue = filteredData.length > 0 ? Math.min(...filteredData.map((item) => item._value)) : 'N/A';
  const averageValue = filteredData.length > 0
    ? (filteredData.reduce((sum, item) => sum + item._value, 0) / filteredData.length).toFixed(2)
    : 'N/A';

  // Group data based on filter type ฟิวเตอร์
  const groupedData = filteredData.reduce((acc, curr) => {
    const itemDate = new Date(curr._time);
    let key;

    if (filterType === 'hour') {
      key = itemDate.toISOString().slice(0, 13);
    } else if (filterType === 'day') {
      key = itemDate.toISOString().slice(0, 10);
    } else if (filterType === 'week') {
      const weekNumber = Math.ceil(itemDate.getDate() / 7);
      key = `${itemDate.getFullYear()}-W${weekNumber}`;
    } else if (filterType === 'month') {
      key = itemDate.toISOString().slice(0, 7);
    }

    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {});

  // Chart data configuration จัดการ chart ต่างๆ
  const chartData = {
    labels: Object.keys(groupedData),
    datasets: selectedSensors.map((sensor, index) => ({
      label: `${sensorMapping[sensor]} (${fieldMapping[selectedField]})`,
      data: Object.values(groupedData).map((group) => {
        const sensorGroup = group.filter((item) => item.sensor_id === sensor);
        return sensorGroup.reduce((sum, item) => sum + item._value, 0) / sensorGroup.length || 0;
      }),
      borderColor: generateColor(index),
      backgroundColor: generateColor(index).replace('1)', '0.5)'),
    })),
  };

  // Bar chart data ข้อมูลกราฟแท่ง
  const barChartData = {
    ...chartData,
    datasets: chartData.datasets.map((dataset) => ({
      ...dataset,
      backgroundColor: dataset.borderColor,
    })),
  };

  // Get unit based on field ตัวเพิ่มหน่วย
  const getUnit = (field) => {
    const unitMapping = {
      co: 'ppm',
      humidity: '%',
      temperature: '°C',
    };
    return unitMapping[field] || '';
  };

  // Table columns คอลั่มในตาราง
  const columns = [
    {
      title: 'Time',
      dataIndex: '_time',
      key: '_time',
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: 'Value',
      dataIndex: '_value',
      key: '_value',
      render: (value) => `${value} ${getUnit(selectedField)}`,
    },
    {
      title: 'Field',
      dataIndex: '_field',
      key: '_field',
      render: (field) => fieldMapping[field] || field,
    },
    {
      title: 'Sensor ID',
      dataIndex: 'sensor_id',
      key: 'sensor_id',
      render: (sensor) => sensorMapping[sensor] || sensor,
    },
  ];

  // Chart options การจัดการกราฟ 
  const chartOptions = {
    scales: {
      x: {
        type: 'category',
        title: { display: true, text: 'Time' },
      },
      y: {
        title: { display: true, text: 'Value' },
      },
    },
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (context) => `${context.raw} ${getUnit(selectedField)}`,
        },
      },
    },
  };


  return (
    <Layout>  
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['1']}
          items={[
            { key: '1', icon: <UserOutlined />, label: 'Dashboard' },
            { key: '2', icon: <UploadOutlined />, label: 'Settings' },
          ]}
        />
      </Sider>

      <Layout>
        <Header className="custom-header">
          <Button type="text" onClick={() => setCollapsed(!collapsed)} className="menu-toggle-button">
            {collapsed ? '☰' : '←'}
          </Button>
          <Typography variant="h5" className="dashboard-title">
            DASHBOARD
          </Typography>
        </Header>

        <Content style={{ margin: '24px 16px', padding: 24, minHeight: 280 }}>
          {/* Summary Cards ตัวแสดงผล*/}
          <Grid container spacing={2} className="summary-card-container">
            <Grid item xs={3}>
              <Card className="card-container-total">
                <CardContent>
                  <Typography variant="h6">Total Data</Typography>
                  <Typography variant="h4">{filteredData.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={3}>
              <Card className="card-container-Ave">
                <CardContent>
                  <Typography variant="h6">Average Value</Typography>
                  <Typography variant="h4">{averageValue} {getUnit(selectedField)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={3}>
              <Card className="card-container-max">
                <CardContent>
                  <Typography variant="h6">Max Value</Typography>
                  <Typography variant="h4">{maxValue} {getUnit(selectedField)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={3}>
              <Card className="card-container-min">
                <CardContent>
                  <Typography variant="h6">Min Value</Typography>
                  <Typography variant="h4">{minValue} {getUnit(selectedField)}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>



          {/* Filters Section  ฟืวเตอร์*/}
          <Box className="filter-section">
            <Box className="field-button-group">
              <ButtonGroup className="custom-button-group">
                <Button onClick={() => setSelectedField('co')} className={selectedField === 'co' ? 'selected' : ''}>
                  CO2
                </Button>
                <Button onClick={() => setSelectedField('humidity')} className={selectedField === 'humidity' ? 'selected' : ''}>
                  Humidity
                </Button>
                <Button onClick={() => setSelectedField('temperature')} className={selectedField === 'temperature' ? 'selected' : ''}>
                  Temperature
                </Button>
              </ButtonGroup>
            </Box>

            <Box className="time-button-group">
              <ButtonGroup className="custom-button-group-secondary">
                <Button onClick={() => setFilterType('hour')} className={filterType === 'hour' ? 'selected' : ''}>
                  Hour
                </Button>
                <Button onClick={() => setFilterType('day')} className={filterType === 'day' ? 'selected' : ''}>
                  Day
                </Button>
                <Button onClick={() => setFilterType('week')} className={filterType === 'week' ? 'selected' : ''}>
                  Week
                </Button>
                <Button onClick={() => setFilterType('month')} className={filterType === 'month' ? 'selected' : ''}>
                  Month
                </Button>
              </ButtonGroup>
            </Box>

            <Box className="date-picker-group">
              <Box>
                <Typography className="date-picker-label">Start Date</Typography>
                <TextField type="date" InputLabelProps={{ shrink: true }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Box>
              <Box>
                <Typography className="date-picker-label">End Date</Typography>
                <TextField type="date" InputLabelProps={{ shrink: true }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </Box>
            </Box>
          </Box>

          <Box className="sensor-section">
            <FormControlLabel
              control={<Checkbox checked={selectedSensors.includes('TLM100')} onChange={() => handleSensorChange('TLM100')} />}
              label="Sensor No.1"
            />
            <FormControlLabel
              control={<Checkbox checked={selectedSensors.includes('TLM200')} onChange={() => handleSensorChange('TLM200')} />}
              label="Sensor No.2"
            />
          </Box>




          {/* Chart and Table Section  กราฟและตาราง */}
          <Box className="chart-and-table-container">
            <Box className="chart-container">
              <Box className="toggle-button-group" mb={2}>
                <ToggleButtonGroup
                  value={chartType}
                  exclusive
                  onChange={(e, newChartType) => setChartType(newChartType || chartType)}
                >
                  <ToggleButton value="line">Line Chart</ToggleButton>
                  <ToggleButton value="bar">Bar Chart</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Typography variant="h6" gutterBottom>{chartType === 'line' ? 'Line Chart' : 'Bar Chart'}</Typography>
              {chartType === 'line' ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <Bar data={barChartData} options={chartOptions} />
              )}
            </Box>

            <Box className="table-container">
              <Typography variant="h6" gutterBottom>Data Table</Typography>
              <Table
                dataSource={filteredData.map((item, index) => ({ ...item, key: item._id || index }))}
                columns={columns}
                pagination={{
                  pageSize: pageSize,
                  showSizeChanger: true,
                  pageSizeOptions: ['5', '10', '20', '50'],
                  onShowSizeChange: (current, size) => setPageSize(size),
                }}
              />
            </Box>
          </Box>
        </Content>
      </Layout>
    </Layout>
  );
};

export default Ui;
