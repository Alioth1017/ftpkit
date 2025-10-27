const { spawn } = require('child_process');

// 测试配置
const testConfigs = [
  {
    name: "FTP Upload Test",
    args: [
      './dist/cli.js',
      '-l', './test',
      '-r', '/site/wwwroot',
      '--host', process.env.FTP_HOST || 'your-ftp-host.com',
      '--port', process.env.FTP_PORT || '21',
      '-u', process.env.FTP_USER || 'username',
      '-p', process.env.FTP_PASSWORD || 'password',
      '-m', 'ftp',
      '--secure',
      '-e', 'index.html'
    ]
  }
];

async function runTest(config) {
  console.log(`\n=== Running ${config.name} ===`);
  
  return new Promise((resolve, reject) => {
    const child = spawn('node', config.args, {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${config.name} completed successfully`);
        resolve(code);
      } else {
        console.log(`❌ ${config.name} failed with code ${code}`);
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      console.error(`❌ ${config.name} error:`, err);
      reject(err);
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting FTP upload tests...');
  
  try {
    for (const config of testConfigs) {
      await runTest(config);
    }
    console.log('\n🎉 All tests completed successfully!');
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

runAllTests();