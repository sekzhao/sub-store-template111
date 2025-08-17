const config = JSON.parse($files[0])   // 读入模板配置
const proxies = await produceArtifact({
  name: $arguments.name,
  type: /^1$|col/i.test($arguments.type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
})

// 把所有节点加入配置
config.outbounds.push(...proxies)

// 分类填充
config.outbounds.forEach(outbound => {
  switch (outbound.tag) {
    case '🇭🇰 香港节点':
      outbound.outbounds.push(...getTags(proxies, /港|hk|hongkong|🇭🇰/i))
      break
    case '🇸🇬 狮城节点':
      outbound.outbounds.push(...getTags(proxies, /sg|singapore|新加坡|狮城|🇸🇬/i))
      break
    case '🇺🇸 美国节点':
      outbound.outbounds.push(...getTags(proxies, /us|united states|america|美|🇺🇸/i))
      break
    case '🇯🇵 日本节点':
      outbound.outbounds.push(...getTags(proxies, /jp|japan|日本|🇯🇵/i))
      break
    case '🇩🇪 德国节点':
      outbound.outbounds.push(...getTags(proxies, /de|germany|德国|🇩🇪/i))
      break
    case '🇹🇭 泰国节点':
      outbound.outbounds.push(...getTags(proxies, /th|thailand|泰|🇹🇭/i))
      break
  }

  // 空分组兜底
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    outbound.outbounds.push('🎯 直连')
  }
})

// 输出
$content = JSON.stringify(config, null, 2)

function getTags(proxies, regex) {
  return proxies.filter(p => regex.test(p.tag)).map(p => p.tag)
}
