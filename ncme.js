const {
    exec
} = require('child_process'), http = require('http'), WebSocket = require('ws'), fs = require("fs"), path = require("path"), readline = require('readline');
let webSocketDebuggerUrl, cloudmusic, wssNum = 0;

function boot() {
    let bat = exec('"' + (cloudmusic || "D:\\Program Files (x86)\\Netease\\CloudMusic\\cloudmusic.exe") + '"' + ' /remote-debugging-port=49513');
    bat.stdout.on('data', (data) => {
        //console.log('data:' + data.toString());
        run();
    });

    bat.stderr.on('data', (data) => {
        //console.log('err:' + data.toString());
        run();
    });

    bat.on('exit', (code) => {
        //console.log(`子进程退出码：${code}`);
        run();
    });
}

function run() {
    if (wssNum > 5) process.exit(); //6次成功不在重复注入
    http.get('http://127.0.0.1:49513/json', function(resp) {
        let data = '';

        // A chunk of data has been recieved.
        resp.on('data', (chunk) => {
            data += chunk;
        });

        // The whole response has been received. Print out the result.
        resp.on('end', () => {
            let t = JSON.parse(data)[0].webSocketDebuggerUrl;
            if (t) webSocketDebuggerUrl = t;
            console.log(webSocketDebuggerUrl)
            infusion();
        });

    }).on("error", (err) => {
        console.log("检测失败：", err);
    });
}

function infusion() {
    try {
        const ws = new WebSocket(webSocketDebuggerUrl);
        ws.onopen = function() {
            fs.readFile(path.join(__dirname, 'in.js'), function(err, data) {
                if (err) {
                    return console.error('读取失败:', err);
                }
                ws.send(JSON.stringify({
                    "id": 0,
                    "method": "Runtime.evaluate",
                    "params": {
                        "expression": data.toString()
                    }
                }));
                console.log('注入完成')
                wssNum++;
                ws.close();
            });
        }
        ws.onerror = function(err) {
            console.error('注入失败：', err);
            ws.close();
        }
    } catch (e) {
        console.error('注入失败：', e)
    }
}
let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function getncme() {
    rl.question("请输入cloudmusic.exe地址或者拖入该文件：", function(p) {
        rl.close();
        p = p || "D:\\Program Files (x86)\\Netease\\CloudMusic\\cloudmusic.exe"
        fs.exists(p, function(exists) {
            if (exists) {
                cloudmusic = p;
                boot();
                fs.writeFile('config.json', JSON.stringify({
                    cloudmusic: cloudmusic
                }), (err) => {
                    if (err) throw err;
                    console.log('The file has been saved!');
                });
            } else {
                getncme();
            }
        })
        // 不加close，则不会结束
    });
}

fs.exists('config.json', function(exists) {
    if (exists) {
        fs.readFile('config.json', function(err, data) {
            if (err) {
                return console.error('读取失败:', err);
            }
            cloudmusic = JSON.parse(data.toString()).cloudmusic;
            boot();
        });
    } else {
        getncme();
    }

})