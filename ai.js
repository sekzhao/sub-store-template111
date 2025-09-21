function main() {
  var type = $arguments.type;
  var name = $arguments.name;
  var compatible_outbound = { tag: "COMPATIBLE", type: "direct" };
  var config = JSON.parse($files[0]);

  // 从订阅/集合生成节点列表
  produceArtifact({
    name: name,
    type: /^1$|col/i.test(type) ? "collection" : "subscription",
    platform: "sing-box",
    produceType: "internal"
  }).then(function(proxies) {
    var outbounds = config.outbounds || [];

    // 确保 COMPATIBLE 存在
    var hasCompatible = false;
    for (var i = 0; i < outbounds.length; i++) {
      if (outbounds[i].tag === "COMPATIBLE") {
        hasCompatible = true;
        break;
      }
    }
    if (!hasCompatible) {
      outbounds.push(compatible_outbound);
    }

    // 地区正则
    var regionPatterns = {
      hk: /(港|hk|hong\s*kong|kong\s*kong|🇭🇰)/i,
      tw: /(台|tw|taiwan|🇹🇼)/i,
      jp: /(日|jp|japan|🇯🇵)/i,
      sg: /^(?!.*us).*(新|sg|singapore|🇸🇬)/i,
      us: /(美|us|united\s*states|🇺🇸)/i
    };

    // 获取匹配的节点标签
    function getTags(pattern) {
      var result = [];
      for (var j = 0; j < proxies.length; j++) {
        if (pattern.test(proxies[j].tag)) {
          result.push(proxies[j].tag);
        }
      }
      return result;
    }

    // 填充地区组
    for (var region in regionPatterns) {
      for (var k = 0; k < outbounds.length; k++) {
        if (outbounds[k].tag === region) {
          var matched = getTags(regionPatterns[region]);
          outbounds[k].outbounds = matched.length ? matched : ["COMPATIBLE"];
        }
      }
    }

    // proxy 主组包含所有地区 + 兜底
    for (var m = 0; m < outbounds.length; m++) {
      if (outbounds[m].tag === "proxy") {
        var allRegions = [];
        for (var r in regionPatterns) {
          allRegions.push(r);
        }
        allRegions.push("COMPATIBLE");
        outbounds[m].outbounds = allRegions;
      }
    }

    config.outbounds = outbounds;
    $content = JSON.stringify(config, null, 2);
  });
}
