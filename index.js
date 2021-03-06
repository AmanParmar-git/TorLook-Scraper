#!/usr/bin/env node
const p = require("puppeteer");
const cheerio = require("cheerio");
const inq = require("inquirer");
const chalk = require("chalk");
const clipboardy = require("clipboardy");
const spawn = require("child_process").spawn;

let query = process.argv;
query.splice(0, 2);
if (query.length === 0) {
  console.log(chalk.redBright("Enter Something to search!"));
  process.exit(0);
}
query = query
  .reduce((res, curr) => res + " " + curr)
  .toString()
  .trim()
  .replace(" ", "%20");

(async function () {
  const browser = p.launch();
  const page = await (await browser).newPage();
  page.setDefaultNavigationTimeout(0);
  page.setViewport({ width: 1920, height: 1080 });
  await page.goto("https://torlook.info/" + query);
  let html = await page.content();
  const { index, length } = await promptData(html);

  if (length !== 1)
    await page.click(
      `div.webResult:nth-child(${index}) > div:nth-child(2) > span:nth-child(3) > span:nth-child(4)`
    );
  else await page.click(".magneto", { button: "left" });
  console.log(chalk.blueBright("This will take around 10-15 seconds!"));
  await sleep(11000);

  html = await page.content();
  clipboardy.writeSync(
    cheerio.load(html)("#seconds_timer > a:nth-child(1)").get("0").attribs.href
  );
  await (await browser).close();
  console.log(chalk.bold.cyanBright("Magnet Copied!! Enjoy Watching."));

  const { choice } = await inq.prompt({
    message:
      "Stream it with Peerflix?? (you should have installed peerflix globally! else it will throw error)",
    choices: ["Yes", "No"],
    name: "choice",
    type: "list",
  });
  if (choice === "Yes") {
    const peerProc = spawn("peerflix", [clipboardy.readSync()]);
    peerProc.stdout.pipe(process.stdout);
    peerProc.stderr.pipe(process.stderr);
  } else {
    process.exit(0);
  }
})();

async function promptData(data) {
  console.log(chalk.yellowBright("Loading..."));
  let result = [];
  const $ = cheerio.load(data);
  const length = $("#resultsDiv").children().length;
  for (let i = 4; i < length; i++) {
    let name = $(
      `div.webResult:nth-child(${i}) > p:nth-child(1) > a:nth-child(1)`
    ).text();
    let provider = $(
      `div.webResult:nth-child(${i}) > div:nth-child(2) > a:nth-child(2)`
    ).text();
    let size = $(
      `div.webResult:nth-child(${i}) > div:nth-child(2) > span:nth-child(3) > span:nth-child(1)`
    ).text();
    let seeders = $(
      `div.webResult:nth-child(${i}) > div:nth-child(2) > span:nth-child(3) > span:nth-child(3) > span:nth-child(1)`
    ).text();
    let leechers = $(
      `div.webResult:nth-child(${i}) > div:nth-child(2) > span:nth-child(3) > span:nth-child(3) > span:nth-child(2)`
    ).text();
    let uploadDate = $(
      `div.webResult:nth-child(${i}) > div:nth-child(2) > span:nth-child(3) > span:nth-child(2)`
    ).text();
    result.push(new Movie(name, provider, size, seeders, leechers, uploadDate));
  }

  console.log(chalk.redBright(`Total ${length - 4} results found!`));
  const choices = result.map(
    (r) =>
      `Name : ${r.Name}  ${chalk.yellow(
        `Provider : ${r.Provider}`
      )}  ${chalk.green(`Size : ${r.Size}`)}  ${chalk.blue(
        `Seeders : ${r.Seeders}`
      )}  ${chalk.cyan(`Leechers : ${r.Leechers}`)}   ${chalk.gray(
        `UploadDate : ${r.UploadDate}`
      )}`
  );
  const { answer } = await inq.prompt({
    message: "Pick a movie...",
    type: "rawlist",
    name: "answer",
    loop: false,
    pageSize: 20,
    choices,
  });

  return { index: choices.indexOf(answer) + 4, length: length - 4 };
}

function sleep(ms) {
  return new Promise((res, rej) => setTimeout(() => res(), ms));
}

function Movie(Name, Provider, Size, Seeders, Leechers, uploadDate) {
  this.Name = Name;
  this.Provider = Provider;
  this.Size = Size;
  this.Seeders = Seeders;
  this.Leechers = Leechers;
  this.UploadDate = uploadDate;
}
