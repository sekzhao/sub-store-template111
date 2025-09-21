/**
 * Sub-Store 脚本 for sing-box (兼容参数筛选版)
 * @author Gemini
 * @version 3.0
 * @description
 * - 保留了通过 URL 参数 (args.name) 筛选节点的核心功能。
 * - 在筛选后的节点基础上，实现了自动测速、中文分组和清晰的策略结构。
 *
 * 使用方法:
 * 1. 直接使用: 处理所有节点。
 * 2. 参数筛选: 在订阅链接后加上 #name=关键字 (如 #name=c-server)，则只处理名称包含 "c-server" 的节点。
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
function main(proxies, args) {
  // 1. 根据 URL 参数筛选节点 (保留原始用法)
  const keyword = args.name;
  let filteredProxies = proxies;
  if (keyword) {
    console.log(`使用关键字 "${keyword}" 筛选节点`);
    filteredProxies = proxies.filter(p => p.name.includes(keyword));
  }
  
  if (filteredProxies.length === 0) {
      console.log("没有找到匹配的节点，返回空配置。");
      return { outbounds: [] };
  }

  // 2. 初始化变量
  const outbounds = [];
  const regionNodes = {};
  const allProxyNames = [];

  for (const regionName in REGIONS) {
    regionNodes[regionName] = [];
  }

  // 3. 遍历和分类筛选后的节点
  filteredProxies.forEach(p => {
    let assigned = false;
    for (const [regionName, regex] of Object.entries(REGIONS)) {
      if (regex.test(p.name)) {
        const emoji = regionName.split(' ')[0];
        // 避免重复添加 emoji
        if (!/^\p{Emoji}/u.test(p.name)) {
            p.name = `${emoji} ${p.name}`;
        }
        regionNodes[regionName].push(p.name);
        assigned = true;
        break;
      }
    }
    outbounds.push(p);
    allProxyNames.push(p.name);
  });

  // 4. 创建核心策略分组
  
  // 4.1 自动选择分组 (url-test)
  if (allProxyNames.length > 0) {
    outbounds.push({
      tag: '🚀 自动选择',
      type: 'url-test',
      outbounds: allProxyNames,
      url: 'http://www.gstatic.com/generate_204',
      interval: '10m',
      tolerance: 100
    });
  }

  // 4.2 手动选择分组 (select) - 按地区
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

  // 4.3 创建 "手动选择" 的主分组
  if (manualGroups.length > 0) {
    outbounds.push({
      tag: ' manually-select',
      type: 'select',
      outbounds: manualGroups
    });
  }
  
  // 4.4 定义主要的 Select 策略组
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
