const TOTAL = 10;     // preguntas en modo práctica
const TIEMPO = 60;    // segundos del desafío relámpago
const VIDAS = 3;      // vidas del desafío tres vidas

let op = "+", nivel = 1, modo = "practica";
let jugando = false, esperando = false, actual = null, ultimo = "";
let numero = 0, aciertos = 0, vidas = VIDAS, segundos = TIEMPO;
let reloj = null, pausa = null, finTiempo = 0;

const $ = id => document.getElementById(id);
const azar = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const elegirUno = lista => lista[azar(0, lista.length - 1)];

const pantallas = { inicio: $("inicio"), juego: $("juego"), final: $("final"), teoria: $("teoria"), login: $("login"), notas: $("notas") };
function mostrar(nombre) {
  Object.entries(pantallas).forEach(([n, el]) => el.classList.toggle("oculto", n !== nombre));
}

/* ---------- Temas por grado (1 = 1.º-2.º, 2 = 3.º-4.º, 3 = 5.º-6.º) ---------- */
const TEMAS = {
  "+":          { simbolo: "+",   nombre: "Sumas" },
  "-":          { simbolo: "−",   nombre: "Restas" },
  "×":          { simbolo: "×",   nombre: "Multiplicar" },
  "÷":          { simbolo: "÷",   nombre: "Dividir" },
  "comparar":   { simbolo: "⚖️",  nombre: "Mayor o menor" },
  "patrones":   { simbolo: "🔢",  nombre: "Patrones" },
  "figuras":    { simbolo: "🔷",  nombre: "Figuras" },
  "fracciones": { simbolo: "🍕",  nombre: "Fracciones" },
  "decimales":  { simbolo: "0.5", nombre: "Decimales" },
  "porcentajes":{ simbolo: "%",   nombre: "Porcentajes" },
  "perimetro":  { simbolo: "📏",  nombre: "Perímetro" },
  "area":       { simbolo: "⬛",  nombre: "Área" },
  "problemas":  { simbolo: "📖",  nombre: "Problemas" }
};
const TEMAS_POR_NIVEL = {
  1: ["+", "-", "comparar", "patrones", "figuras", "problemas"],
  2: ["+", "-", "×", "comparar", "patrones", "fracciones", "figuras", "perimetro", "problemas"],
  3: ["+", "-", "×", "÷", "comparar", "patrones", "fracciones", "decimales", "porcentajes", "figuras", "perimetro", "area", "problemas"]
};

/* ---------- Generadores de preguntas ---------- */
function numeros(o) {
  const max = { 1: 20, 2: 100, 3: 1000 }[nivel];
  const tabla = { 1: 5, 2: 10, 3: 12 }[nivel];
  let a, b, r;
  if (o === "+") { a = azar(1, max); b = azar(1, max); r = a + b; }
  else if (o === "-") { a = azar(2, max); b = azar(1, a); r = a - b; }
  else if (o === "×") { a = azar(2, tabla); b = azar(2, nivel === 3 ? 20 : 10); r = a * b; }
  else { b = azar(2, tabla); r = azar(2, nivel === 3 ? 20 : 10); a = b * r; }
  return { a, b, r };
}

const basica = o => () => {
  const { a, b, r } = numeros(o);
  return { consigna: "Resuelve", texto: `${a} ${o} ${b}`, tipo: "numero", respuesta: r };
};

const HECHOS = {
  1: [["¿Cuántos lados tiene un triángulo?", 3], ["¿Cuántos lados tiene un cuadrado?", 4],
      ["¿Cuántos lados tiene un pentágono?", 5], ["¿Cuántos lados tiene un hexágono?", 6],
      ["¿Cuántos lados tiene un rectángulo?", 4], ["¿Cuántas esquinas tiene un triángulo?", 3]],
  2: [["¿Cuántas caras tiene un cubo?", 6], ["¿Cuántos vértices tiene un cubo?", 8],
      ["¿Cuántas aristas tiene un cubo?", 12], ["¿Cuántos lados tiene un octágono?", 8],
      ["¿Cuántos lados tiene un heptágono?", 7], ["¿Cuántas caras tiene una pirámide de base cuadrada?", 5]],
  3: [["¿Cuántos grados suman los ángulos de un triángulo?", 180], ["¿Cuántos grados suman los ángulos de un cuadrado?", 360],
      ["¿Cuántos grados mide un ángulo recto?", 90], ["¿Cuántos grados mide un ángulo llano?", 180],
      ["¿Cuántos lados tiene un decágono?", 10], ["¿Cuántas caras tiene un prisma triangular?", 5]]
};

const NOMBRES = ["Ana", "Luis", "Sofía", "Mateo", "Valeria", "Diego", "Camila", "Emiliano"];
const BASICAS_POR_NIVEL = { 1: ["+", "-"], 2: ["+", "-", "×"], 3: ["+", "-", "×", "÷"] };

const GEN = {
  "+": basica("+"),
  "-": basica("-"),
  "×": basica("×"),
  "÷": basica("÷"),

  comparar: () => {
    let x, y;
    if (nivel === 3) { do { x = azar(10, 999) / 100; y = azar(10, 999) / 100; } while (x === y); }
    else { const max = nivel === 1 ? 100 : 10000; do { x = azar(1, max); y = azar(1, max); } while (x === y); }
    const mayor = Math.random() < 0.5;
    const r = mayor ? Math.max(x, y) : Math.min(x, y);
    return { consigna: "", texto: `¿Cuál número es ${mayor ? "mayor" : "menor"}?`, tipo: "opcion",
             opciones: [String(x), String(y)], respuesta: String(r) };
  },

  patrones: () => {
    const t = [];
    if (nivel === 3 && Math.random() < 0.4) {
      const k = azar(2, 3); let v = azar(1, 5);
      for (let i = 0; i < 5; i++) { t.push(v); v *= k; }
    } else {
      const paso = { 1: azar(1, 5), 2: azar(2, 12), 3: azar(5, 25) }[nivel];
      const baja = nivel > 1 && Math.random() < 0.3;
      let v = baja ? paso * 6 + azar(0, 10) : azar(0, 20);
      for (let i = 0; i < 5; i++) { t.push(v); v += baja ? -paso : paso; }
    }
    const r = t.pop();
    return { consigna: "¿Qué número sigue?", texto: t.join(", ") + ", ?", tipo: "numero", respuesta: r };
  },

  figuras: () => {
    const [texto, r] = elegirUno(HECHOS[nivel]);
    return { consigna: "", texto, tipo: "numero", respuesta: r };
  },

  fracciones: () => {
    if (nivel === 2 && Math.random() < 0.4) {
      let d1, d2; do { d1 = azar(2, 9); d2 = azar(2, 9); } while (d1 === d2);
      const mayor = Math.random() < 0.5;
      const r = mayor ? Math.min(d1, d2) : Math.max(d1, d2);   // mismo numerador: menor denominador = fracción mayor
      return { consigna: "", texto: `¿Cuál fracción es ${mayor ? "mayor" : "menor"}?`, tipo: "opcion",
               opciones: [`1/${d1}`, `1/${d2}`], respuesta: `1/${r}` };
    }
    if (nivel === 3 && Math.random() < 0.5) {
      const d = azar(4, 12), a = azar(1, d - 2), b = azar(1, d - a);
      return { consigna: "¿Qué número va en lugar del ?", texto: `${a}/${d} + ${b}/${d} = ?/${d}`, tipo: "numero", respuesta: a + b };
    }
    const d = azar(2, nivel === 3 ? 8 : 5);
    const n = nivel === 3 ? azar(2, d - 1) : 1;
    const N = d * azar(2, 10);
    return { consigna: "¿Cuánto es…?", texto: `${n}/${d} de ${N}`, tipo: "numero", respuesta: n * N / d };
  },

  decimales: () => {
    const x = azar(11, 99) / 10, y = azar(11, 99) / 10;
    const suma = Math.random() < 0.5;
    const a = suma ? x : Math.max(x, y), b = suma ? y : Math.min(x, y);
    const r = Math.round((suma ? a + b : a - b) * 10) / 10;
    return { consigna: "Resuelve", texto: `${a.toFixed(1)} ${suma ? "+" : "−"} ${b.toFixed(1)}`, tipo: "numero", respuesta: r };
  },

  porcentajes: () => {
    const p = elegirUno([10, 25, 50, 75]);
    const base = 20 * azar(1, 10);
    return { consigna: "¿Cuánto es…?", texto: `${p}% de ${base}`, tipo: "numero", respuesta: base * p / 100 };
  },

  perimetro: () => {
    const max = nivel === 2 ? 12 : 30;
    if (Math.random() < 0.5) {
      const l = azar(2, max);
      return { consigna: "Calcula el perímetro (cm)", texto: `Cuadrado de ${l} cm por lado`, tipo: "numero", respuesta: 4 * l };
    }
    const b = azar(2, max), h = azar(2, max);
    return { consigna: "Calcula el perímetro (cm)", texto: `Rectángulo de ${b} cm por ${h} cm`, tipo: "numero", respuesta: 2 * (b + h) };
  },

  area: () => {
    const b = azar(2, 20); let h = azar(2, 20);
    if (Math.random() < 0.5) {
      return { consigna: "Calcula el área (cm²)", texto: `Rectángulo de ${b} cm por ${h} cm`, tipo: "numero", respuesta: b * h };
    }
    if (b % 2 === 1 && h % 2 === 1) h++;   // para que el área del triángulo sea entera
    return { consigna: "Calcula el área (cm²)", texto: `Triángulo con base ${b} cm y altura ${h} cm`, tipo: "numero", respuesta: b * h / 2 };
  },

  problemas: () => {
    const o = elegirUno(BASICAS_POR_NIVEL[nivel]);
    const { a, b, r } = numeros(o);
    const n = elegirUno(NOMBRES);
    const historias = {
      "+": [`${n} tiene ${a} estampas y recibe ${b} más. ¿Cuántas estampas tiene ahora?`,
            `En la tienda había ${a} manzanas y llegaron ${b} más. ¿Cuántas manzanas hay en total?`],
      "-": [`${n} tenía ${a} galletas y se comió ${b}. ¿Cuántas galletas le quedan?`,
            `En el salón había ${a} sillas y se llevaron ${b}. ¿Cuántas sillas quedan?`],
      "×": [`En cada caja hay ${a} lápices. ¿Cuántos lápices hay en ${b} cajas?`,
            `${n} compra ${b} paquetes con ${a} globos cada uno. ¿Cuántos globos compra?`],
      "÷": [`${n} reparte ${a} dulces en partes iguales entre ${b} amigos. ¿Cuántos dulces le tocan a cada uno?`,
            `Hay ${a} alumnos y se forman equipos de ${b}. ¿Cuántos equipos se forman?`]
    };
    return { consigna: "", texto: elegirUno(historias[o]), tipo: "numero", respuesta: r };
  }
};

function nuevaPregunta() {
  const tema = modo === "practica" ? op : elegirUno(TEMAS_POR_NIVEL[nivel]);
  let q;
  for (let i = 0; i < 5; i++) { q = GEN[tema](); if (q.texto !== ultimo) break; }
  return q;
}


/* ---------- Teoría (corta) por tema; algunas cambian según el grado ---------- */
const TEORIA = {
  "+": n => n === 1 ? {
    parrafos: ["Sumar es <b>juntar cantidades</b>. Al resultado le decimos suma o total.",
               "Si te ayuda, cuenta con los dedos o dibuja bolitas."],
    ejemplo: ["Tienes 5 canicas y te regalan 3.", "5 + 3 = 8", "¡Ahora tienes 8 canicas!"]
  } : {
    parrafos: ["Sumar es <b>juntar cantidades</b>. Con números grandes se suma por columnas: unidades con unidades, decenas con decenas, centenas con centenas.",
               "Si una columna da más de 9, escribes la unidad y “llevas” 1 a la columna de la izquierda."],
    ejemplo: ["47 + 38", "7 + 8 = 15, escribo 5 y llevo 1", "4 + 3 + 1 = 8", "Resultado: 85"]
  },

  "-": n => n === 1 ? {
    parrafos: ["Restar es <b>quitar</b> o ver <b>cuánto falta</b>. Al resultado le decimos resta o diferencia.",
               "Para comprobar, suma el resultado con lo que quitaste: tienes que volver al número del inicio."],
    ejemplo: ["Tenías 9 galletas y te comiste 4.", "9 − 4 = 5", "Comprobar: 5 + 4 = 9 ✓"]
  } : {
    parrafos: ["Restar también se hace por columnas, empezando por las unidades.",
               "Si el número de arriba es más chico que el de abajo, “pides prestada” 1 decena (son 10 unidades)."],
    ejemplo: ["52 − 27", "El 2 no alcanza para quitar 7: pido prestada 1 decena y queda 12 − 7 = 5",
              "Ahora quedan 4 decenas: 4 − 2 = 2", "Resultado: 25 (comprobar: 25 + 27 = 52 ✓)"]
  },

  "×": () => ({
    parrafos: ["Multiplicar es <b>sumar el mismo número varias veces</b>.",
               "El orden no importa: 3 × 4 da lo mismo que 4 × 3. Aprenderte las tablas te ayuda a hacerlo rápido.",
               "Truco: multiplicar por 10 es agregar un cero al final (7 × 10 = 70)."],
    ejemplo: ["4 × 3 significa 3 veces el 4", "4 + 4 + 4 = 12", "Entonces 4 × 3 = 12"]
  }),

  "÷": () => ({
    parrafos: ["Dividir es <b>repartir en partes iguales</b>. Es lo contrario de multiplicar.",
               "Si no sabes la respuesta, piensa: ¿qué número multiplicado por el que divide me da el de arriba?"],
    ejemplo: ["12 ÷ 3 = ?", "Pienso: 3 × 4 = 12", "Entonces 12 ÷ 3 = 4"]
  }),

  comparar: n => n < 3 ? {
    parrafos: ["Comparar es decir cuál número es <b>mayor</b> (más grande) y cuál es <b>menor</b> (más chico).",
               "Primero fíjate cuántas cifras tiene cada uno: el que tiene más cifras es mayor. Si tienen las mismas, compara de izquierda a derecha."],
    ejemplo: ["85 y 58: los dos tienen 2 cifras", "Comparo las decenas: 8 es más que 5", "85 es mayor que 58"]
  } : {
    parrafos: ["Con decimales, compara primero la parte entera. Si es igual, compara las décimas, luego las centésimas.",
               "Truco: agrega ceros para que los dos números tengan las mismas cifras decimales."],
    ejemplo: ["0.7 y 0.65", "0.7 es lo mismo que 0.70", "70 centésimas es más que 65 centésimas", "0.7 es mayor que 0.65"]
  },

  patrones: n => ({
    parrafos: ["Un patrón es una serie de números que sigue una <b>regla</b>.",
               "Para descubrirla mira cuánto cambia de un número al siguiente: ¿sube o baja?, ¿cuánto?"]
      .concat(n >= 2 ? ["Si los números van bajando, la regla es restar: 20, 17, 14, ? baja de 3 en 3, así que sigue el 11."] : [])
      .concat(n === 3 ? ["A veces la regla es multiplicar: 2, 4, 8, 16… cada número es el doble del anterior."] : []),
    ejemplo: ["2, 4, 6, 8, ?", "Cada número sube 2", "8 + 2 = 10, así que sigue el 10"]
  }),

  figuras: n => n === 1 ? {
    parrafos: ["Los <b>lados</b> son las rayitas que forman una figura. Cada figura se llama según cuántos lados tiene.",
               "Una figura tiene tantas esquinas como lados: el triángulo tiene 3 lados y 3 esquinas."],
    etiqueta: "Para recordar",
    ejemplo: ["Triángulo: 3 lados", "Cuadrado y rectángulo: 4 lados", "Pentágono: 5 lados", "Hexágono: 6 lados"]
  } : n === 2 ? {
    parrafos: ["Los cuerpos geométricos tienen <b>caras</b> (las superficies planas), <b>aristas</b> (las líneas donde se juntan dos caras) y <b>vértices</b> (las puntas)."],
    etiqueta: "Para recordar",
    ejemplo: ["Cubo: 6 caras, 12 aristas y 8 vértices", "Pirámide de base cuadrada: 5 caras (4 triángulos y la base)",
              "Heptágono: 7 lados", "Octágono: 8 lados"]
  } : {
    parrafos: ["Los ángulos se miden en <b>grados</b>. Un ángulo recto mide 90° y uno llano (una línea recta) mide 180°.",
               "Los ángulos de un triángulo siempre suman 180°. Los de un cuadrado o un rectángulo suman 360°."],
    etiqueta: "Para recordar",
    ejemplo: ["Cuadrado: 4 ángulos rectos, 4 × 90 = 360°", "Decágono: 10 lados", "Prisma triangular: 5 caras (2 triángulos y 3 rectángulos)"]
  },

  fracciones: n => n === 2 ? {
    parrafos: ["Una fracción reparte un entero en <b>partes iguales</b>. En 1/4, el 4 dice en cuántas partes se divide y el 1 cuántas partes tomas.",
               "Para sacar 1/4 de una cantidad, divídela entre 4.",
               "Si dos fracciones tienen el mismo número arriba, mientras más partes, más chiquitas son. Por eso 1/2 es mayor que 1/4."],
    ejemplo: ["1/4 de 20", "20 ÷ 4 = 5", "Respuesta: 5"]
  } : {
    parrafos: ["Para sacar n/d de una cantidad: divide entre el de abajo (d) y luego multiplica por el de arriba (n).",
               "Para sumar fracciones con el mismo denominador, suma los numeradores y deja el denominador igual."],
    ejemplo: ["3/4 de 20: 20 ÷ 4 = 5 y 5 × 3 = 15", "2/8 + 3/8 = 5/8"]
  },

  decimales: () => ({
    parrafos: ["Los decimales son partes de un entero. Lo que está después del punto son décimas, centésimas…",
               "Para sumar o restar, alinea los puntos decimales y opera como siempre."],
    ejemplo: ["3.4 + 2.8", "4 + 8 = 12, escribo 2 y llevo 1", "3 + 2 + 1 = 6", "Resultado: 6.2"]
  }),

  porcentajes: () => ({
    parrafos: ["Porcentaje significa “de cada 100”. Se escribe con el símbolo %.", "Estos son fáciles de recordar:"],
    etiqueta: "Para recordar",
    ejemplo: ["50% es la mitad (÷ 2)", "25% es la cuarta parte (÷ 4)", "10% es dividir entre 10", "75% son tres cuartas partes (÷ 4 y × 3)",
              "Con 80: 50% = 40, 25% = 20, 10% = 8, 75% = 60"]
  }),

  perimetro: () => ({
    parrafos: ["El perímetro es lo que mide el <b>contorno</b> de una figura: se suman todos sus lados.",
               "Cuadrado: sus 4 lados miden igual, así que es 4 × lado. Rectángulo: 2 × (base + altura)."],
    ejemplo: ["Cuadrado de 5 cm por lado: 4 × 5 = 20 cm", "Rectángulo de 6 cm por 3 cm: 2 × (6 + 3) = 18 cm"]
  }),

  area: () => ({
    parrafos: ["El área es cuánto espacio cubre una figura por dentro. Se mide en centímetros cuadrados (cm²).",
               "Rectángulo: base × altura. Triángulo: base × altura ÷ 2, porque es la mitad de un rectángulo."],
    ejemplo: ["Rectángulo de 6 cm por 4 cm: 6 × 4 = 24 cm²", "Triángulo de base 6 cm y altura 4 cm: 6 × 4 ÷ 2 = 12 cm²"]
  }),

  problemas: n => ({
    parrafos: ["Para resolver un problema: 1) lee con calma, 2) busca los números importantes, 3) decide qué operación usar, 4) resuelve y revisa si la respuesta tiene sentido."],
    etiqueta: "Pistas para elegir la operación",
    ejemplo: ["Juntar o recibir más: suma (+)", "Quitar o ver cuánto queda: resta (−)"]
      .concat(n >= 2 ? ["Grupos iguales: multiplicación (×)"] : [])
      .concat(n === 3 ? ["Repartir en partes iguales: división (÷)"] : [])
  })
};

let teoriaDesde = "inicio", teoriaTema = "+";
function abrirTeoria(tema, desde) {
  teoriaDesde = desde; teoriaTema = tema;
  const t = TEORIA[tema](nivel);
  $("teoriaTitulo").textContent = `${TEMAS[tema].simbolo} ${TEMAS[tema].nombre}`;
  $("teoriaCuerpo").innerHTML = t.parrafos.map(x => `<p>${x}</p>`).join("") +
    `<div class="ejemplo"><strong>${t.etiqueta || "Ejemplo"}</strong><br>${t.ejemplo.join("<br>")}</div>`;
  $("teoPracticar").classList.toggle("oculto", desde === "juego");
  $("teoVolver").textContent = desde === "juego" ? "Volver al juego" : "Volver";
  mostrar("teoria");
  window.scrollTo(0, 0);
}

/* ---------- Pantalla de inicio ---------- */
const DESCRIPCIONES = {
  aprender:  "Lee una explicación corta del tema y luego practica.",
  practica:  "10 preguntas del tema que elijas.",
  relampago: `${TIEMPO} segundos. Resuelve todas las que puedas, con temas mezclados.`,
  vidas:     `Tienes ${VIDAS} vidas y cada error te quita una. ¿Cuántas puedes acertar?`
};

function pintarTemas() {
  const disponibles = TEMAS_POR_NIVEL[nivel];
  if (!disponibles.includes(op)) op = disponibles[0];
  $("operaciones").innerHTML = disponibles.map(k =>
    `<button class="op" data-op="${k}" aria-pressed="${k === op}">` +
    `<span class="simbolo">${TEMAS[k].simbolo}</span>${TEMAS[k].nombre}</button>`
  ).join("");
}

function pintarModo() {
  $("descModo").textContent = DESCRIPCIONES[modo];
  $("grupoTemas").classList.toggle("oculto", modo !== "practica" && modo !== "aprender");
  $("empezar").textContent = modo === "aprender" ? "Ver explicación" : "¡Empezar!";
}

function setModo(m) {
  modo = m;
  $("modos").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x.dataset.m === m));
  pintarModo();
}

$("niveles").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  $("niveles").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
  nivel = Number(b.dataset.n);
  pintarTemas();
});

$("modos").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  setModo(b.dataset.m);
});

$("operaciones").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  $("operaciones").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
  op = b.dataset.op;
});

pintarTemas();
pintarModo();

/* ---------- Juego ---------- */
function limpiarTiempos() {
  clearInterval(reloj); clearTimeout(pausa);
  reloj = null; pausa = null;
}

function pintarBarra() {
  if (modo === "practica") $("numero").textContent = `Pregunta ${numero} de ${TOTAL}`;
  else if (modo === "relampago") $("numero").textContent = `⏱ ${segundos} s`;
  else $("numero").textContent = "❤️".repeat(vidas) + "🖤".repeat(VIDAS - vidas);
  $("puntos").textContent = `⭐ ${aciertos}`;
}

function tick() {
  const resto = Math.max(0, finTiempo - Date.now());
  segundos = Math.ceil(resto / 1000);
  $("relleno").style.width = `${(resto / (TIEMPO * 1000)) * 100}%`;
  pintarBarra();
  if (resto <= 0) terminar();
}

function empezar() {
  limpiarTiempos();
  jugando = true; esperando = false; ultimo = "";
  numero = 0; aciertos = 0; vidas = VIDAS; segundos = TIEMPO;
  mostrar("juego");
  $("progreso").classList.toggle("oculto", modo === "vidas");
  $("repasar").classList.toggle("oculto", modo !== "practica");
  if (modo === "relampago") {
    $("relleno").style.width = "100%";
    finTiempo = Date.now() + TIEMPO * 1000;
    reloj = setInterval(tick, 100);
  }
  siguientePregunta();
}

function siguientePregunta() {
  if (!jugando) return;
  numero++; esperando = false;
  actual = nuevaPregunta(); ultimo = actual.texto;
  if (modo === "practica") $("relleno").style.width = `${((numero - 1) / TOTAL) * 100}%`;
  pintarBarra();

  $("consigna").textContent = actual.consigna;
  $("consigna").classList.toggle("oculto", !actual.consigna);
  $("cuenta").textContent = actual.texto;
  $("cuenta").classList.toggle("texto", actual.texto.length > 18);
  $("mensaje").textContent = ""; $("mensaje").className = "mensaje";
  $("memeBox").classList.add("oculto");

  const esOpcion = actual.tipo === "opcion";
  $("entrada").classList.toggle("oculto", esOpcion);
  $("opcionesJuego").classList.toggle("oculto", !esOpcion);
  $("comprobar").classList.toggle("oculto", esOpcion);
  $("comprobar").textContent = "Comprobar";
  if (esOpcion) {
    $("opcionesJuego").innerHTML = actual.opciones.map(o => `<button class="opcion">${o}</button>`).join("");
  } else {
    $("respuesta").value = "";
    $("respuesta").focus();
  }
}

const FELICITACIONES = ["¡Muy bien!", "¡Genial!", "¡Eres un genio!", "¡Excelente!", "¡Así se hace!"];

function aviso(texto, clase) { $("mensaje").textContent = texto; $("mensaje").className = "mensaje " + clase; }

function responder(entrada) {
  if (!jugando || esperando) return;
  let ok;
  if (actual.tipo === "opcion") {
    ok = entrada === actual.respuesta;
  } else {
    const n = Number(String(entrada).trim().replace(",", "."));
    if (String(entrada).trim() === "" || Number.isNaN(n)) { aviso("Escribe un número primero.", "mal"); return; }
    ok = Math.abs(n - actual.respuesta) < 1e-9;
  }
  esperando = true;

  if (actual.tipo === "opcion") {
    $("opcionesJuego").querySelectorAll("button").forEach(b => {
      b.disabled = true;
      if (b.textContent === actual.respuesta) b.classList.add("bien");
      else if (b.textContent === entrada) b.classList.add("mal");
    });
  }

  if (ok) { aciertos++; aviso(elegirUno(FELICITACIONES), "bien"); }
  else {
    if (modo === "vidas") vidas--;
    aviso(`Casi. La respuesta era ${actual.respuesta}. ¡La próxima sale!`, "mal");
    $("memeBox").innerHTML = memeHTML(MEMES.error, MEMES_IMG.error);
    $("memeBox").classList.remove("oculto");
  }
  pintarBarra();

  if (modo === "vidas" && vidas <= 0) { pausa = setTimeout(terminar, 1900); return; }
  if (modo === "practica") {
    $("comprobar").classList.remove("oculto");
    $("comprobar").textContent = numero >= TOTAL ? "Ver resultado" : "Siguiente";
  } else {
    pausa = setTimeout(siguientePregunta, ok ? 700 : (modo === "vidas" ? 1900 : 1300));
  }
}

function accion() {
  if (esperando) { if (modo === "practica") { numero >= TOTAL ? terminar() : siguientePregunta(); } }
  else responder($("respuesta").value);
}

/* ---------- Resultado y récords ---------- */
function leerRecord(clave) { return recordsCache[clave] || 0; }
function guardarRecord(clave, valor) { recordsCache[clave] = valor; }
function registrarPartida() {
  if (!usuario || usuario.invitado) return;
  api("/api/partidas", { method: "POST", body: JSON.stringify({
    modo, tema: modo === "practica" ? op : "mixto", nivel, aciertos, total: modo === "practica" ? TOTAL : null
  }) }).catch(() => {});
}

function terminar() {
  if (!jugando) return;
  jugando = false; limpiarTiempos();
  const [u1, u2, u3] = { practica: [3, 6, 9], relampago: [4, 8, 12], vidas: [3, 6, 10] }[modo];
  const estrellas = aciertos >= u3 ? 3 : aciertos >= u2 ? 2 : aciertos >= u1 ? 1 : 0;
  $("estrellas").textContent = "★".repeat(estrellas) + "☆".repeat(3 - estrellas);
  $("titulo").textContent = estrellas === 3 ? "¡Eres un MiniGENIO!" : estrellas >= 1 ? "¡Buen trabajo!" : "¡Sigue practicando!";
  $("nota").classList.toggle("oculto", modo !== "practica");
  if (modo === "practica") $("nota").textContent = `${aciertos}/${TOTAL}`;
  $("memeFinal").innerHTML = memeHTML(MEMES.final[estrellas], MEMES_IMG.final[estrellas]);

  let texto;
  if (modo === "practica") texto = `Acertaste ${aciertos} de ${TOTAL}.`;
  else {
    texto = modo === "relampago" ? `Resolviste ${aciertos} en ${TIEMPO} segundos.` : `Acertaste ${aciertos} antes de quedarte sin vidas.`;
    const clave = `${modo}-${nivel}`;
    const mejor = leerRecord(clave);
    if (aciertos > mejor) { guardarRecord(clave, aciertos); if (aciertos > 0) texto += " 🏆 ¡Nuevo récord!"; }
    else texto += ` Tu récord es ${mejor}.`;
  }
  $("resumen").textContent = texto;
  $("verTeoria").classList.toggle("oculto", modo !== "practica");
  registrarPartida();
  mostrar("final");
}

$("empezar").addEventListener("click", () => modo === "aprender" ? abrirTeoria(op, "inicio") : empezar());
$("repasar").addEventListener("click", () => abrirTeoria(op, "juego"));
$("verTeoria").addEventListener("click", () => abrirTeoria(op, "final"));
$("teoPracticar").addEventListener("click", () => { op = teoriaTema; setModo("practica"); empezar(); });
$("teoVolver").addEventListener("click", () => {
  mostrar(teoriaDesde);
  if (teoriaDesde === "juego" && actual && actual.tipo === "numero" && !esperando) $("respuesta").focus();
});
$("comprobar").addEventListener("click", accion);
$("respuesta").addEventListener("keydown", e => { if (e.key === "Enter") accion(); });
$("opcionesJuego").addEventListener("click", e => {
  const b = e.target.closest(".opcion"); if (b && !b.disabled) responder(b.textContent);
});
$("otra").addEventListener("click", empezar);
$("cambiar").addEventListener("click", () => mostrar("inicio"));

/* ---------- Memes ---------- */
// Para usar tus propios memes: mete las imágenes en una carpeta "memes" junto a index.html
// y escribe aquí sus rutas, por ejemplo: error: ["memes/ups1.jpg", "memes/ups2.png"]
const MEMES_IMG = { error: [], final: { 0: [], 1: [], 2: [], 3: [] } };

const FONDOS = ["#ffd9e0", "#d9f7e8", "#fff0b8", "#d9e8ff", "#eadcff"];
const MEMES = {
  error: [
    { emoji: "🤔", arriba: "¿Seguro que era así?", abajo: "Casi, casi" },
    { emoji: "😅", arriba: "Mi cerebro:", abajo: "cargando..." },
    { emoji: "🙈", arriba: "Ups", abajo: "Ya sé, otra vez" },
    { emoji: "🐢", arriba: "Voy lento pero", abajo: "voy seguro" },
    { emoji: "🦥", arriba: "Pensando la respuesta", abajo: "(sigo pensando)" },
    { emoji: "🫠", arriba: "Yo viendo la cuenta", abajo: "y la cuenta viéndome" },
    { emoji: "🧠", arriba: "Mi cerebro ahorita", abajo: "respuesta no encontrada" }
  ],
  final: {
    0: [{ emoji: "😴", arriba: "Hoy no fue mi día", abajo: "mañana sí" },
        { emoji: "🌱", arriba: "Todos empezamos así", abajo: "a crecer" }],
    1: [{ emoji: "🙂", arriba: "Voy mejorando", abajo: "poquito a poquito" },
        { emoji: "🐢", arriba: "Lento pero seguro", abajo: "ya casi" }],
    2: [{ emoji: "😎", arriba: "Casi genio", abajo: "un empujoncito más" },
        { emoji: "💪", arriba: "Mis neuronas hicieron ejercicio", abajo: "buen entrenamiento" }],
    3: [{ emoji: "🤩", arriba: "¡Soy un MiniGENIO!", abajo: "nivel: leyenda" },
        { emoji: "🧠", arriba: "Mi cerebro hoy", abajo: "modo súper genio" },
        { emoji: "🏆", arriba: "¿Matemáticas?", abajo: "fácil" }]
  }
};

function memeHTML(lista, listaImg) {
  if (listaImg.length && Math.random() < 0.5) {
    return `<div class="meme"><img src="${elegirUno(listaImg)}" alt="Meme"></div>`;
  }
  const m = elegirUno(lista);
  return `<div class="meme" style="background:${elegirUno(FONDOS)}">` +
         `<div class="meme-texto">${m.arriba}</div><div class="meme-emoji">${m.emoji}</div><div class="meme-texto">${m.abajo}</div></div>`;
}

/* ---------- Cuentas (las guarda el servidor) ---------- */
const CLAVE_TOKEN = "minigenios-token";
// Si abres la página con Live Server (otro puerto), la API sigue estando en el puerto 3000.
const API_BASE = (location.protocol === "file:" ||
  (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && location.port !== "3000")) ? "http://localhost:3000" : "";
let usuario = null, token = null, recordsCache = {};

const leerTexto = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const guardarTexto = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const borrarClave = k => { try { localStorage.removeItem(k); } catch (e) {} };
const avisoLogin = t => { $("loginMsg").textContent = t; };

async function api(ruta, opciones = {}) {
  const cabeceras = { "Content-Type": "application/json" };
  if (token) cabeceras.Authorization = "Bearer " + token;
  let r;
  try { r = await fetch(API_BASE + ruta, { ...opciones, headers: cabeceras }); }
  catch (e) { const err = new Error("No se pudo conectar con el servidor. ¿Está encendido?"); err.red = true; throw err; }
  let datos = {};
  try { datos = await r.json(); } catch (e) {}
  if (!r.ok) { const err = new Error(datos.error || "Algo salió mal."); err.estado = r.status; throw err; }
  return datos;
}

function pintarUsuario() {
 const inv = !usuario || usuario.invitado === true;  
  $("saludo").textContent = inv ? "Jugando sin cuenta" : `Hola, ${usuario.nombre} 👋`;
  $("verNotas").classList.toggle("oculto", inv);
  $("salir").textContent = inv ? "Iniciar sesión" : "Salir";
}

async function entrarConSesion(respuesta) {
  if (respuesta.token) { token = respuesta.token; guardarTexto(CLAVE_TOKEN, token); }
  usuario = { id: respuesta.usuario.id, nombre: respuesta.usuario.nombre };
  try { recordsCache = await api("/api/records"); } catch (e) { recordsCache = {}; }
  $("loginNombre").value = ""; $("loginPassword").value = ""; avisoLogin("");
  pintarUsuario();
  mostrar("inicio");
}

function entrarInvitado() {
  usuario = { id: null, nombre: "invitado", invitado: true };
  token = null; recordsCache = {};
  borrarClave(CLAVE_TOKEN);
  $("loginNombre").value = ""; $("loginPassword").value = ""; avisoLogin("");
  pintarUsuario();
  mostrar("inicio");
}

function leerCampos() {
  const nombre = $("loginNombre").value.trim(), password = $("loginPassword").value;
  if (nombre.length < 2) { avisoLogin("Escribe tu nombre (mínimo 2 letras)."); return null; }
  if (password.length < 4) { avisoLogin("La contraseña debe tener al menos 4 caracteres."); return null; }
  return { nombre, password };
}

function ocupado(si) {
  ["loginEntrar", "loginCrear", "loginInvitado"].forEach(id => { $(id).disabled = si; });
}

async function enviarCredenciales(ruta) {
  const c = leerCampos(); if (!c) return;
  ocupado(true); avisoLogin("Un momento...");
  try {
    token = null;
    await entrarConSesion(await api(ruta, { method: "POST", body: JSON.stringify(c) }));
  } catch (e) {
    avisoLogin(e.message);
    if (e.estado === 401) $("loginPassword").value = "";
  } finally { ocupado(false); }
}

function salir() {
  usuario = null; token = null; recordsCache = {};
  borrarClave(CLAVE_TOKEN);
  mostrar("login");
}

const NOMBRES_MODO = { practica: "Práctica", relampago: "Relámpago", vidas: "Tres vidas" };
const NOMBRES_GRADO = { 1: "1.º-2.º", 2: "3.º-4.º", 3: "5.º-6.º" };

async function abrirNotas() {
  try {
    const d = await api("/api/partidas");
    if (!d.total) {
      $("resumenNotas").textContent = "Todavía no has jugado. ¡Anímate a empezar!";
      $("listaNotas").innerHTML = "";
    } else {
      $("resumenNotas").textContent = `Partidas: ${d.total}` +
        (d.promedioPractica !== null ? `. Promedio en práctica: ${d.promedioPractica.toFixed(1)} de 10.` : ".");
      $("listaNotas").innerHTML = d.partidas.slice(0, 10).map(x => {
        const fecha = new Date(x.f).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
        const tema = x.tema === "mixto" ? "Temas mezclados" : (TEMAS[x.tema] ? TEMAS[x.tema].nombre : "");
        const res = x.total ? `${x.aciertos}/${x.total}` : `${x.aciertos} ⭐`;
        return `<li><span>${fecha} · ${NOMBRES_MODO[x.modo]} · ${tema} · ${NOMBRES_GRADO[x.nivel]}</span><span class="res">${res}</span></li>`;
      }).join("");
    }
  } catch (e) {
    $("resumenNotas").textContent = e.message;
    $("listaNotas").innerHTML = "";
  }
  mostrar("notas");
}

$("loginEntrar").addEventListener("click", () => enviarCredenciales("/api/login"));
$("loginCrear").addEventListener("click", () => enviarCredenciales("/api/registro"));
$("loginInvitado").addEventListener("click", entrarInvitado);
$("loginPassword").addEventListener("keydown", e => { if (e.key === "Enter") enviarCredenciales("/api/login"); });
$("salir").addEventListener("click", salir);
$("verNotas").addEventListener("click", abrirNotas);
$("notasVolver").addEventListener("click", () => mostrar("inicio"));

(async function arrancar() {
  token = leerTexto(CLAVE_TOKEN);
  if (!token) { mostrar("login"); return; }
  try {
    const r = await api("/api/yo");
    await entrarConSesion({ usuario: r.usuario });
  } catch (e) {
    if (e.red) avisoLogin(e.message); else { token = null; borrarClave(CLAVE_TOKEN); }
    mostrar("login");
  }
})();