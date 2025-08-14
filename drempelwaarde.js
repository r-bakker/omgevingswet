function toetsDrempelwaarde() {
  const a = parseFloat(document.getElementById("a").value) || 0;
  const b = parseFloat(document.getElementById("b").value) || 0;
  const c = parseFloat(document.getElementById("c").value) || 0;

  let resultaat = "onder de drempelwaarde";

  if (a > 10 || b > 20 || c > 40) {
    resultaat = "boven de tweede drempelwaarde";
  } else if (a > 5 || b > 10 || c > 20) {
    resultaat = "boven de eerste drempelwaarde";
  }

  document.getElementById("resultaat").innerText = resultaat;
}
