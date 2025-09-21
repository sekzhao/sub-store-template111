// 地区正则集中管理
const regionPatterns = {
  hk: /\b(港|hk|hong\s*kong|kong\s*kong|🇭🇰)\b/i,
  tw: /\b(台|tw|taiwan|🇹🇼)\b/i,
  jp: /\b(日|jp|japan|🇯🇵)\b/i,
  sg: /^(?!.*us).*\b(新|sg|singapore|🇸🇬)\b/i,
  us: /\b(美|us|united\s*states|🇺🇸)\b/i
};

function getTags(proxies, pattern) {
  return proxies
    .filter(p => pattern.test(p.tag))
    .map(p => p.tag);
}

function main(config) {
  const proxies = config.outbounds || [];
  const compatible = "COMPATIBLE";

  // 确保 COMPATIBLE 存在
  if (!proxies.find(p => p.tag === compatible)) {
    config.outbounds.push({ tag: compatible, type: "direct" });
  }

  // 动态填充地区组
  Object.keys(regionPatterns).forEach(region => {
    const group = config.outbounds.find(o => o.tag === region);
    if (group) {
      const matched = getTags(proxies, regionPatterns[region]);
      group.outbounds = matched.length ? matched : [compatible];
    }
  });

  // proxy 主组包含所有地区 + 兜底
  const proxyGroup = config.outbounds.find(o => o.tag === "proxy");
  if (proxyGroup) {
    proxyGroup.outbounds = Object.keys(regionPatterns).concat(compatible);
  }

  return config;
}

module.exports = { main };
