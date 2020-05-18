async function get_fund() {
    return await fetch("http://fund.eastmoney.com/110022.html")
    .then(data => data.text());
}