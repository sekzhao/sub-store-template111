// 保持原执行结构：顶层解构参数
const { type, name } = $arguments;

// 兜底出站节点
const compatible_outbound = { tag: 'COMPATIBLE', type: 'direct' };
let compatible;

// 读取模板 JSON
let config = JSON.parse($files[0]);

// 生成节点列表（保持顶层 await）
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
});

// 将节点加入顶层 outbounds
config.outbounds.push(...proxies);

// 地区正则集中管理
const regionPatterns = {
  all: null, // null 表示不过滤，返回全部
  hk: /\b(港|hk|hong\s*kong|kong\s*kong|🇭🇰)\b/i,
  tw: /\b(台|tw|taiwan|🇹🇼)\b/i,
  jp: /\b(日|jp|japan|🇯🇵)\b/i,
  sg: /^(?!.*us).*\b(新|sg|singapore|🇸🇬)\b/i,
  us: /\b(美|us|united\s*states|🇺🇸)\b/i
};

// 遍历分组，按 tag 填充节点
config.outbounds.forEach(group => {
  const tag = group.tag;
  if (regionPatterns.hasOwnProperty(tag)) {
    const matched = getTags(proxies, regionPatterns[tag]);
    group.outbounds.push(...matched);
  }
  // 对带 -auto 的测速组也做匹配
  const baseTag = tag.replace(/-auto$/, '');
  if (regionPatterns.hasOwnProperty(baseTag) && /-auto$/.test(tag)) {
    const matched = getTags(proxies, regionPatterns[baseTag]);
    group.outbounds.push(...matched);
  }
});

// 空组兜底：如果某个 selector/urltest 没有节点，则加 COMPATIBLE
config.outbounds.forEach(outbound => {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!compatible) {
      config.outbounds.push(compatible_outbound);
      compatible = true;
    }
    outbound.outbounds.push(compatible_outbound.tag);
  }
});

// 输出最终配置
$content = JSON.stringify(config, null, 2);

// 工具函数：按正则筛选节点 tag；regex=null 时返回全部
function getTags(proxies, regex) {
  return (regex ? proxies.filter(p => regex.test(p.tag)) : proxies).map(p => p.tag);
}
