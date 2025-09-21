/**
 * Sub-Store 脚本 for sing-box
 * * @author Gemini
 * @version 2.0
 * @description 优化版 sing-box 脚本，实现自动测速、中文分组和清晰的策略结构。
 * * 功能:
 * 1. 自动创建 `url-test` 分组，实现节点自动选择最低延迟。
 * 2. 按地区（香港、台湾、新加坡、日本、美国等）对节点进行分类。
 * 3. 创建清晰的中文策略组：代理策略 -> 自动选择 / 手动选择 -> 各地区节点。
 * 4. 支持 Netflix、YouTube 等流媒体策略。
 * 5. 兼容原始模板的路由规则。
 */

// --- 配置区域 ---
// 你可以在这里添加或修改地区关键词
const REGIONS = {
  "🇭🇰 香港": /港|HK|Hong Kong/i,
  "🇹🇼 台湾": /台|TW|Taiwan/i,
  "🇸🇬 新加坡": /新|SG|Singapore/i,
  "🇯🇵 日本": /日|JP|Japan/i,
  "🇺🇸 美国": /美|US|United States/i,
  "🇬🇧 英国": /英|UK|United Kingdom/i,
  "🇰🇷 韩国": /韩|KR|Korea/i,
  "其他": /.*/ // 匹配所有其他节点
};

// --- 主要处理逻辑 ---
// 请不要修改下面的代码，除非你了解其工作原理
function main(proxies) {
  const outbounds = [];
  const regionNodes = {};
  const allProxyNames = [];

  // 初始化地区节点数组
  for (const regionName in REGIONS) {
    regionNodes[regionName] = [];
  }

  // 1. 遍历和分类所有节点
  proxies.forEach(p => {
    // 为节点名称添加 emoji 前缀，方便识别
    let assigned = false;
    for (const [regionName, regex] of Object.entries(REGIONS)) {
      if (regex.test(p.name)) {
        const emoji = regionName.split(' ')[0];
        p.name = `${emoji} ${p.name}`;
        regionNodes[regionName].push(p.name);
        assigned = true;
        break;
      }
    }
    // 原始节点直接加入 outbounds
    outbounds.push(p);
    allProxyNames.push(p.name);
  });

  // 2. 创建核心策略分组
  
  // 2.1 自动选择分组 (url-test)
  if (allProxyNames.length > 0) {
    outbounds.push({
      tag: '🚀 自动选择',
      type: 'url-test',
      outbounds: allProxyNames,
      url: 'http://www.gstatic.com/generate_204',
      interval: '10m', // 每10分钟测试一次延迟
      tolerance: 100    // 延迟高于最低值 100ms 时切换
    });
  }

  // 2.2 手动选择分组 (select) - 按地区
  const manualGroups = [];
  for (const [regionName, nodes] of Object.entries(regionNodes)) {
    if (nodes.length > 0) {
      const groupTag = `✋ ${regionName}`;
      outbounds.push({
        tag: groupTag,
        type: 'select',
        outbounds: nodes
      });
      manualGroups.push(groupTag);
    }
  }

  // 2.3 创建 "手动选择" 的主分组
  if (manualGroups.length > 0) {
    outbounds.push({
      tag: ' manually-select',
      type: 'select',
      outbounds: manualGroups
    });
  }
  
  // 2.4 定义主要的 Select 策略组
  const policyGroups = {
    '代理策略': ['🚀 自动选择', ' manually-select', 'DIRECT', 'REJECT', ...manualGroups],
    '国外流量': ['代理策略', 'DIRECT'],
    '国内流量': ['DIRECT', '代理策略'],
    '广告拦截': ['REJECT', 'DIRECT'],
    'YouTube': ['代理策略', 'DIRECT'],
    'Netflix': ['代理策略', 'DIRECT'],
    '漏网之鱼': ['代理策略', 'DIRECT']
  };

  for (const [tag, groupOutbounds] of Object.entries(policyGroups)) {
    outbounds.push({
      tag: tag,
      type: 'select',
      outbounds: groupOutbounds.filter(name => {
          // 过滤掉不存在的分组
          if (name === ' manually-select') return manualGroups.length > 0;
          if (name === '🚀 自动选择') return allProxyNames.length > 0;
          return true;
      })
    });
  }
  
  return {
    "outbounds": outbounds
  };
}
