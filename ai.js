// 加载远程配置功能 (需 Sub-Store 支持)
const remoteConfigLoader = async (url) => {
  try {
    const response = await $http.get({ url });
    return response.data;
  } catch (e) {
    $notification.post("配置加载失败", `${e.message}`, "");
    throw new Error("Remote config fetch failed");
  }
};

// URL 参数解析器
function parseUrlParams() {
  const hash = $request.url.split("#")[1] || "";
  return Object.fromEntries(
    hash.split("&").map(pair => {
      const [key, value] = pair.split("=");
      return [key, decodeURIComponent(value)];
    })
  );
}

// 主处理流程
async function handle() {
  // 从 URL 参数获取订阅地址
  const params = parseUrlParams(); 
  const subUrl = params.url || $arguments.url;

  if (!subUrl) {
    throw new Error("订阅URL参数缺失，请使用#url=your_subscribe_link");
  }

  // 获取并处理远程订阅
  const remoteConfig = await remoteConfigLoader(subUrl);
  
  // 转换逻辑示例
  const outbounds = remoteConfig.proxies.map(proxy => ({
    type: proxy.type,
    tag: proxy.name,
    server: proxy.server,
    port: proxy.port,
    uuid: proxy.uuid || "",
    tls: proxy.tls ? { enabled: true } : null
  }));

  // 合并本地模板
  return {
    ...$json,
    outbounds: [
      ...outbounds,
      { type: "direct", tag: "DIRECT" }
    ]
  };
}

// 执行入口
handle().then(res => $done(res)).catch(e => $done({ error: e.message }));
