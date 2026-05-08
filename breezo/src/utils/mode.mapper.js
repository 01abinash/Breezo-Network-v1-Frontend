export const mapNodeToDevice = (node) => ({
  cityKey: node.nodeId,
  cityLabel: node.nodeId,

  coords: [node.lat, node.lng],

  aqi: node.aqi,
  status: node.aqiLevel,

  color: getMarkerColor(node.aqi),

  connectivity: "online", // you can improve later
  lastSeen: "just now",

  uptime: 100,
  sampleRate: "5s",

  telemetry: {
    pm25: node.pm25,
    temperature: node.temperature,
    humidity: 0,
    mq135: 0,
  },
});
