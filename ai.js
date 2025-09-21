async function main({ proxies }) {
  const regions = ['HK', 'JP', 'US', 'SG', 'TW', 'KR', 'DE', 'FR']
  const groups = []
  const outbounds = []
  const compatible_tag = 'COMPATIBLE'

  // 插入订阅节点
  outbounds.push(...proxies)

  // 区域分组生成器
  for (const region of regions) {
    const matched = proxies.filter(p => new RegExp(region, 'i').test(p.name))
    const tags = matched.map(p => p.name)
    if (tags.length > 0) {
      groups.push({ type: 'selector', tag: `${region}-select`, outbounds: tags })
      groups.push({
        type: 'urltest',
        tag: `${region}-auto`,
        outbounds: tags,
        url: 'http://cp.cloudflare.com/generate_204',
        interval: 300,
        tolerance: 50,
        concurrency: 10
      })
      groups.push({
        type: 'fallback',
        tag: `${region}-fallback`,
        outbounds: tags,
        url: 'http://cp.cloudflare.com/generate_204',
        interval: 300,
        concurrency: 10
      })
      groups.push({
        type: 'load-balance',
        tag: `${region}-balance`,
        outbounds: tags,
        strategy: 'round-robin'
      })
    }
  }

  // GLOBAL 自动测速组
  const allTags = proxies.map(p => p.name)
  groups.push({
    type: 'urltest',
    tag: 'GLOBAL-AUTO',
    outbounds: allTags,
    url: 'http://cp.cloudflare.com/generate_204',
    interval: 300,
    tolerance: 50,
    concurrency: 20
  })

  // 插入 direct 和 block 出站
  outbounds.push({ type: 'direct', tag: 'direct' })
  outbounds.push({ type: 'block', tag: 'block' })

  // 插入兼容节点（防止空组报错）
  outbounds.push({ type: 'direct', tag: compatible_tag })
  groups.forEach(group => {
    if (Array.isArray(group.outbounds) && group.outbounds.length === 0) {
      group.outbounds.push(compatible_tag)
    }
  })

  return {
    outbounds: proxies,
    proxy_groups: groups
  }
}
