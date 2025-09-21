let proxies = $proxy

let config = {
  log: { level: "info", timestamp: true },
  dns: {
    servers: [
      { tag: "dns-cf", address: "https://1.1.1.1/dns-query", address_strategy: "prefer_ipv4" },
      { tag: "dns-quad9", address: "https://dns.quad9.net/dns-query", address_strategy: "prefer_ipv4" }
    ],
    rules: [
      { domain_suffix: "google.com", server: "dns-cf" },
      { domain_suffix: "cn", server: "dns-quad9" }
    ],
    strategy: "ipv4_only",
    independent_cache: true,
    fakeip: { enabled: true, range: "198.18.0.0/16" },
    domain_matcher: "full"
  },
  route: {
    rule_set: [
      {
        tag: "geosite-cn",
        type: "remote",
        format: "binary",
        url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat",
        update_interval: "24h"
      },
      {
        tag: "geoip-cn",
        type: "remote",
        format: "binary",
        url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat",
        update_interval: "24h"
      }
    ],
    rules: [
      { rule_set: "geosite-cn", outbound: "直连" },
      { rule_set: "geoip-cn", outbound: "直连" },
      { ip_cidr: ["geoip:cn"], outbound: "直连" },
      { ip_cidr: ["geoip:private"], outbound: "直连" },
      { default: true, outbound: "🌐全球自动" }
    ],
    auto_detect_interface: true
  },
  experimental: {
    clash_api: {
      external_controller: "127.0.0.1:9090",
      external_ui: "https://cdn.jsdelivr.net/gh/MetaCubeX/metacubexd@gh-pages",
      secret: "your-secret-key"
    }
  },
  inbounds: [
    {
      type: "mixed",
      listen: "127.0.0.1",
      listen_port: 7890,
      sniff: true,
      set_system_proxy: true
    }
  ],
  outbounds: [],
  proxy_groups: []
}

// 插入订阅节点
config.outbounds.push(...proxies)

// 区域分组定义（中文标签）
const regions = [
  { tag: "🇭🇰 香港", regex: /港|hk|hongkong|🇭🇰/i },
  { tag: "🇯🇵 日本", regex: /日本|jp|japan|🇯🇵/i },
  { tag: "🇺🇸 美国", regex: /美|us|unitedstates|🇺🇸/i },
  { tag: "🇸🇬 新加坡", regex: /新|sg|singapore|🇸🇬/i },
  { tag: "🇹🇼 台湾", regex: /台|tw|taiwan|🇹🇼/i },
  { tag: "🇰🇷 韩国", regex: /韩|kr|korea|🇰🇷/i },
  { tag: "🇩🇪 德国", regex: /德|de|germany|🇩🇪/i },
  { tag: "🇫🇷 法国", regex: /法|fr|france|🇫🇷/i }
]

// 动态生成分组结构
regions.forEach(region => {
  const matched = proxies.filter(p => region.regex.test(p.name))
  const tags = matched.map(p => p.name)
  if (tags.length > 0) {
    config.proxy_groups.push({ type: "selector", tag: `${region.tag}手动`, outbounds: tags })
    config.proxy_groups.push({
      type: "urltest",
      tag: `${region.tag}自动`,
      outbounds: tags,
      url: "http://cp.cloudflare.com/generate_204",
      interval: 300,
      tolerance: 50,
      concurrency: 20
    })
    config.proxy_groups.push({
      type: "fallback",
      tag: `${region.tag}容错`,
      outbounds: tags,
      url: "http://cp.cloudflare.com/generate_204",
      interval: 300,
      concurrency: 20
    })
    config.proxy_groups.push({
      type: "load-balance",
      tag: `${region.tag}均衡`,
      outbounds: tags,
      strategy: "round-robin"
    })
  }
})

// 全局测速组
const allTags = proxies.map(p => p.name)
config.proxy_groups.push({
  type: "urltest",
  tag: "🌐全球自动",
  outbounds: allTags,
  url: "http://cp.cloudflare.com/generate_204",
  interval: 300,
  tolerance: 50,
  concurrency: 30
})

// 插入静态出站
config.outbounds.push({ type: "direct", tag: "直连" })
config.outbounds.push({ type: "block", tag: "拦截" })

// 插入兼容节点并填充空组
const compatible_outbound = { tag: "兼容直连", type: "direct" }
config.outbounds.push(compatible_outbound)
config.proxy_groups.forEach(group => {
  if (Array.isArray(group.outbounds) && group.outbounds.length === 0) {
    group.outbounds.push(compatible_outbound.tag)
  }
})

// 输出完整配置
$content = JSON.stringify(config, null, 2)
