// 获取订阅节点列表（从 url 参数传入）
let proxies = $proxy

// 初始化输出结构
let outbounds = [...proxies]
let proxy_groups = []

// 中文区域分组定义
const regions = [
  { tag: '🇭🇰 香港', regex: /港|hk|hongkong|🇭🇰/i },
  { tag: '🇯🇵 日本', regex: /日本|jp|japan|🇯🇵/i },
  { tag: '🇺🇸 美国', regex: /美|us|unitedstates|🇺🇸/i },
  { tag: '🇸🇬 新加坡', regex: /新|sg|singapore|🇸🇬/i },
  { tag: '🇹🇼 台湾', regex: /台|tw|taiwan|🇹🇼/i },
  { tag: '🇰🇷 韩国', regex: /韩|kr|korea|🇰🇷/i },
  { tag: '🇩🇪 德国', regex: /德|de|germany|🇩🇪/i },
  { tag: '🇫🇷 法国', regex: /法|fr|france|🇫🇷/i }
]

// 动态生成分组结构
regions.forEach(region => {
  const matched = proxies.filter(p => region.regex.test(p.name))
  const tags = matched.map(p => p.name)
  if (tags.length > 0) {
    proxy_groups.push({ type: 'selector', tag: `${region.tag}手动`, outbounds: tags })
    proxy_groups.push({
      type: 'urltest',
      tag: `${region.tag}自动`,
      outbounds: tags,
      url: 'http://cp.cloudflare.com/generate_204',
      interval: 300,
      tolerance: 50,
      concurrency: 20
    })
    proxy_groups.push({
      type: 'fallback',
      tag: `${region.tag}容错`,
      outbounds: tags,
      url: 'http://cp.cloudflare.com/generate_204',
      interval: 300,
      concurrency: 20
    })
    proxy_groups.push({
      type: 'load-balance',
      tag: `${region.tag}均衡`,
      outbounds: tags,
      strategy: 'round-robin'
    })
  }
})

// 全局测速组
const allTags = proxies.map(p => p.name)
proxy_groups.push({
  type: 'urltest',
  tag: '🌐全球自动',
  outbounds: allTags,
  url: 'http://cp.cloudflare.com/generate_204',
  interval: 300,
  tolerance: 50,
  concurrency: 30
})

// 插入静态出站
outbounds.push({ type: 'direct', tag: '直连' })
outbounds.push({ type: 'block', tag: '拦截' })

// 插入兼容节点并填充空组
const compatible_outbound = { tag: '兼容直连', type: 'direct' }
outbounds.push(compatible_outbound)
proxy_groups.forEach(group => {
  if (Array.isArray(group.outbounds) && group.outbounds.length === 0) {
    group.outbounds.push(compatible_outbound.tag)
  }
})

// 输出结构供模板插入
return {
  outbounds,
  proxy_groups
}
