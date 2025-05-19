// backend/utils/dateFormatter.js
function formatUTCtoIST(utcString) {
  const utcDate = new Date(utcString + ' UTC');
  const istDate = new Date(utcDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const displayTime = istDate.toLocaleString("en-GB", {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false
  }).replace(',', '');
  return displayTime;
}

module.exports = { formatUTCtoIST };
