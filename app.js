const inputData = document.querySelector("#inputData");
const apiKeyInput = document.querySelector("#apiKey");
const modelInput = document.querySelector("#model");
const investmentInput = document.querySelector("#investment");
const productsContainer = document.querySelector("#products");
const addProductButton = document.querySelector("#addProduct");
const generateButton = document.querySelector("#generateButton");
const clearButton = document.querySelector("#clearButton");
const output = document.querySelector("#output");
const status = document.querySelector("#status");

const setStatus = (message, tone = "info") => {
  status.textContent = message;
  status.dataset.tone = tone;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const buildPrompt = ({ data, investment, productsSummary, totals }) => {
  return `Você é um analista de marketing. Gere um relatório simples em português (pt-BR) com base nos dados absolutos abaixo.\n\nRegras:\n- Replique cada linha com a métrica, mantendo os nomes informados.\n- Para cada etapa, calcule a porcentagem em relação à etapa anterior, quando fizer sentido.\n- A taxa de compra deve ser baseada nos leads confirmados (não nos leads no grupo).\n- Se houver moeda, use o formato R$ 0,00.\n- No final, inclua um insight rápido em uma frase curta.\n\nDados absolutos:\n${data}\n\nInformações financeiras:\nInvestimento: ${investment}\nProdutos vendidos:\n${productsSummary}\nReceita total: ${totals.revenue}\nResultado (lucro/prejuízo): ${totals.profit}\nCampanha foi lucrativa? ${totals.isProfitable}`;
};

const callOpenAI = async ({ apiKey, model, payload }) => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Você é um assistente que gera relatórios de marketing curtos e objetivos.",
        },
        {
          role: "user",
          content: buildPrompt(payload),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro ${response.status}: ${errorBody}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Resposta vazia da API.");
  }

  return content.trim();
};

const createProductRow = () => {
  const row = document.createElement("div");
  row.className = "product-row";

  row.innerHTML = `
    <input type="text" placeholder="Nome do produto" aria-label="Nome do produto" />
    <input type="number" min="0" step="1" placeholder="Qtd" aria-label="Quantidade vendida" />
    <input type="number" min="0" step="0.01" placeholder="Valor (R$)" aria-label="Valor unitário" />
    <button type="button" aria-label="Remover produto">Remover</button>
  `;

  row.querySelector("button").addEventListener("click", () => {
    row.remove();
  });

  return row;
};

const collectProducts = () => {
  const rows = Array.from(productsContainer.querySelectorAll(".product-row"));
  return rows
    .map((row) => {
      const [nameInput, qtyInput, priceInput] = row.querySelectorAll("input");
      const name = nameInput.value.trim();
      const quantity = Number(qtyInput.value);
      const price = Number(priceInput.value);

      if (!name || Number.isNaN(quantity) || Number.isNaN(price)) {
        return null;
      }

      return {
        name,
        quantity,
        price,
        total: quantity * price,
      };
    })
    .filter(Boolean);
};

addProductButton.addEventListener("click", () => {
  productsContainer.appendChild(createProductRow());
});

generateButton.addEventListener("click", async () => {
  const data = inputData.value.trim();
  const apiKey = apiKeyInput.value.trim();
  const model = modelInput.value.trim() || "gpt-4o-mini";
  const investmentRaw = investmentInput.value.trim();
  const investmentValue = investmentRaw === "" ? 0 : Number(investmentRaw);
  const products = collectProducts();

  if (!data) {
    setStatus("Insira os dados absolutos antes de gerar o relatório.", "warning");
    output.textContent = "";
    return;
  }

  if (investmentRaw !== "" && Number.isNaN(investmentValue)) {
    setStatus("Informe o investimento da campanha em reais.", "warning");
    output.textContent = "";
    return;
  }

  if (products.length === 0) {
    setStatus("Adicione ao menos um produto vendido.", "warning");
    output.textContent = "";
    return;
  }

  if (!apiKey) {
    setStatus("Informe sua chave da OpenAI para gerar o relatório.", "warning");
    output.textContent =
      "Para proteger sua chave, ela não fica salva. Insira a chave e tente novamente.";
    return;
  }

  setStatus("Gerando relatório com IA...", "loading");
  generateButton.disabled = true;

  const revenueTotal = products.reduce((sum, product) => sum + product.total, 0);
  const profit = revenueTotal - investmentValue;
  const payload = {
    data,
    investment: investmentRaw === "" ? "Não informado" : formatCurrency(investmentValue),
    productsSummary: products
      .map(
        (product) =>
          `${product.name}: ${product.quantity} unidade(s) x ${formatCurrency(
            product.price
          )} = ${formatCurrency(product.total)}`
      )
      .join("\n"),
    totals: {
      revenue: formatCurrency(revenueTotal),
      profit: formatCurrency(profit),
      isProfitable: profit >= 0 ? "Sim" : "Não",
    },
  };

  try {
    const report = await callOpenAI({ apiKey, model, payload });
    output.textContent = report;
    setStatus("Relatório gerado com sucesso!", "success");
  } catch (error) {
    setStatus("Não foi possível gerar o relatório.", "error");
    output.textContent = error.message;
  } finally {
    generateButton.disabled = false;
  }
});

clearButton.addEventListener("click", () => {
  inputData.value = "";
  investmentInput.value = "";
  productsContainer.innerHTML = "";
  productsContainer.appendChild(createProductRow());
  output.textContent = "Seu relatório aparecerá aqui.";
  setStatus("Pronto para gerar seu relatório.", "info");
});

productsContainer.appendChild(createProductRow());
