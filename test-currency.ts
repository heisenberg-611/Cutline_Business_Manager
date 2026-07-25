import { formatMoney } from './src/lib/format'

console.log("USD:", formatMoney(123456, "USD"))
console.log("EUR:", formatMoney(123456, "EUR"))
console.log("GBP:", formatMoney(123456, "GBP"))
console.log("JPY:", formatMoney(123456, "JPY"))
console.log("BDT:", formatMoney(123456, "BDT"))
