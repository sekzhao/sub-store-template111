function main(config) {
  // 地区正则集中管理
  var regionPatterns = {
    hk: /\b(港|hk|hong\s*kong|kong\s*kong|🇭🇰)\b/i,
    tw: /\b(台|tw|taiwan|🇹🇼)\b/i,
    jp: /\b(日|jp|japan|🇯🇵)\b/i,
    sg: /^(?!.*us).*\b(新|sg|singapore|🇸🇬)\b/i,
    us: /\b(美|us|united\s*states|🇺🇸)\b/i
  };

  function getTags(proxies, pattern) {
    var result = [];
    for (var i = 0; i < proxies.length; i++) {
      if (pattern.test(proxies[i].tag)) {
        result.push(proxies[i].tag);
      }
    }
    return result;
  }

  var proxies = config.outbounds || [];
  var compatible = "COMPATIBLE";

  // 确保 COMPATIBLE 存在
  var hasCompatible = false;
  for (var i = 0; i < proxies.length; i++) {
    if (proxies[i].tag === compatible) {
      hasCompatible = true;
      break;
    }
  }
  if (!hasCompatible) {
    config.outbounds.push({ tag: compatible, type: "direct" });
  }

  // 动态填充地区组
  for (var region in regionPatterns) {
    for (var j = 0; j < config.outbounds.length; j++) {
      if (config.outbounds[j].tag === region) {
        var matched = getTags(proxies, regionPatterns[region]);
        config.outbounds[j].outbounds = matched.length ? matched : [compatible];
      }
    }
  }

  // proxy 主组包含所有地区 + 兜底
  for (var k = 0; k < config.outbounds.length; k++) {
    if (config.outbounds[k].tag === "proxy") {
      var allRegions = [];
      for (var r in regionPatterns) {
        allRegions.push(r);
      }
      allRegions.push(compatible);
      config.outbounds[k].outbounds = allRegions;
    }
  }

  return config;
}
