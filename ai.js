// 强力订阅解析器 (sing-box 格式专用)
const MAIN_TAG = "dynamic-proxy"; // 主配置标识

// 远程订阅加载器
async function fetchRemoteConfig(url) {
  try {
    const start = Date.now();
    const resp = await $http.get({ url, timeout: 5000 });
    $notification.post('订阅加载', `成功获取${url}`, `耗时 ${Date.now() - start}ms`);
    return resp.data;
  } catch (e) {
    $notification.post('订阅加载失败', e.message, url);
    throw new Error(`[FETCH ERROR] ${e}`);
  }
}

// sing-box 配置验证器
function validateConfig(config) {
  const mustKeys = ['outbounds', 'route'];
  if (!mustKeys.every(k => config.hasOwnProperty(k))) {
    throw new Error('无效的 sing-box 格式订阅');
  }
  return config;
}

// 主处理流程
async function handle() {
  // 1. 参数解析
  const urlParams = new URLSearchParams($request.url.split('#')[1] || '');
  const subUrl = urlParams.get('url');

  if (!subUrl) {
    throw new Error('URL参数必须包含 #url=订阅链接');
  }

  // 2. 获取远程配置
  const remoteConfig = validateConfig(await fetchRemoteConfig(subUrl));

  // 3. 合并配置模板
  const finalConfig = {
    ...$json,  // 基础模板
    outbounds: [
      // 保留模板中的默认出站
      ...$json.outbounds.filter(o => o.tag !== MAIN_TAG), 
      // 注入远程配置
      ...remoteConfig.outbounds.map(proxy => ({
        ...proxy,
        tag: `${MAIN_TAG}-${proxy.tag}`
      }))
    ],
    route: {
      ...$json.route,
      rules: [
        ...$json.route.rules,
        // 自动生成规则：所有流量走动态代理
        {
          protocol: ["tcp", "udp"],
          outbound: `${MAIN_TAG}-${remoteConfig.outbounds[0].tag}`
        }
      ]
    }
  };

  return finalConfig;
}

// 执行入口
handle().then($done).catch(e => $done({ error: e.message }));
