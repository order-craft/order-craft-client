import { Chart, Legend, Tooltip, BarElement, LineElement, PointElement, ArcElement } from 'chart.js'

// Plugin and element defaults only exist once they are registered. Charts
// register these themselves too; registering twice is a no-op.
Chart.register(Legend, Tooltip, BarElement, LineElement, PointElement, ArcElement)

// One place for chart typography and chrome, so every chart in the app
// reads in the same voice as the UI around it. Dataset colors stay with
// each chart; these are the shared defaults.
Chart.defaults.font.family = "'Schibsted Grotesk', -apple-system, 'Segoe UI', sans-serif"
Chart.defaults.font.size = 12
Chart.defaults.color = '#5e6963'
Chart.defaults.borderColor = '#e9ece6'

Chart.defaults.plugins.legend.labels.usePointStyle = true
Chart.defaults.plugins.legend.labels.boxWidth = 8
Chart.defaults.plugins.legend.labels.boxHeight = 8
Chart.defaults.plugins.legend.labels.padding = 14

Chart.defaults.plugins.tooltip.backgroundColor = '#17201c'
Chart.defaults.plugins.tooltip.padding = 10
Chart.defaults.plugins.tooltip.cornerRadius = 8
Chart.defaults.plugins.tooltip.boxPadding = 4
Chart.defaults.plugins.tooltip.titleFont = { weight: '700' }

Chart.defaults.elements.bar.borderRadius = 4
Chart.defaults.elements.line.tension = 0.3
Chart.defaults.elements.line.borderWidth = 2
Chart.defaults.elements.point.radius = 2.5
Chart.defaults.elements.point.hoverRadius = 5
Chart.defaults.elements.arc.borderWidth = 2
Chart.defaults.elements.arc.borderColor = '#ffffff'
