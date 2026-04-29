import { STORAGE_KEYS } from './store.js';

export const diccionario = {
    es: {
        appTitle: "Floux - ", currencyLabel: "Moneda", tabDirect: "Ya sé mi presupuesto", tabCalc: "Ayúdame a calcular",
        budgetLabel: "Presupuesto Mensual", budgetPlaceholder: "Ej: 2000", 
        incomeLabel: "Renta Mensual Total",
        pctLongTerm: "Inversión Largo Plazo (%) - Rec: 20%",
        pctShortTerm: "Inversión Corto Plazo (%) - Rec: 10%",
        pctEdu: "Educación (%) - Rec: 5%",
        pctSurvival: "Supervivencia (%) - Rec: 55%",
        pctFree: "Gastos Libres (%) - Rec: 10%",
        fixedPixLabel: "Renta comprometida (PIX/Transferencia)",
        calcResult: "Valor seguro para gastar:",
        spentLabel: "¿Ya gastaste algo?", btnStart: "Guardar y Continuar", limitToday: "Tu límite de hoy",
        remainsMonth: "Restante", spentMonth: "Gastado",
        addExpenseTitle: "Registrar Gasto", amountPlaceholder: "Monto", descPlaceholder: "Descripción",
        btnAdd: "Agregar", btnEdit: "Guardar Edición", analysisTitle: "Distribución de Gastos", expensesMonth: "Historial",
        btnExport: "Exportar", btnImport: "Importar", btnReset: "Borrar App", noExpenses: "Sin gastos.",
        prevExpense: "Gasto Previo", alertReset: "🚨 ¿ESTÁS SEGURO?", cat_comida: "Comida",
        cat_transporte: "Transporte", cat_supermercado: "Super", cat_cuentas: "Cuentas",
        cat_ocio: "Ocio", cat_otros: "Otros", newCategory: "Nueva Categoría", catNamePlaceholder: "Nombre (ej: Gimnasio)",
        catEmojiPlaceholder: "Emoji (ej: 🏋️)", btnSave: "Guardar", errorBudget: "Por favor ingresa un presupuesto mayor a 0.",
        flouxVisionTitle: "FlouxVision - Pérdida Invisible", 
        lsimExplanation: "El costo de oportunidad es el dinero que dejas de ganar al elegir gastar en lugar de invertir. Calcula el valor real a futuro de esa compra.",
        lsimAmount: "Costo Inicial de la Compra", 
        lsimYears: "Años Proyectados", 
        lsimHelpYears: "¿Cuánto tiempo el dinero estaría invirtiéndose?",
        lsimRate: "Tasa de Rendimiento Anual", 
        lsimHelpRate: "Retorno promedio del mercado (ej. S&P 500 = 8-10%)",
        lsimCostLabel: "Gasto Hoy:",
        lsimFutureLabel: "Valor Futuro:",
        lsimTotalLoss: "Estás perdiendo ",
        lsimTotalLossEnd: " en ganancias potenciales.",
        btnOpenFlouxVision: "🔮 Simulador FlouxVision", 
        btnClose: "Cerrar",
        menuAdjustBudget: "Ajustar Presupuesto",
        paceLabel: "Ritmo vs. Calendario",
        summaryTitle: "Resumen del Mes", summaryPerf: "Rendimiento:", summaryGreatest: "Gasto Mayor:", summaryDaily: "Promedio Diario:", summarySave: "Ahorro: ", summaryDeficit: "Déficit: "
    },
    en: {
        appTitle: "Floux - ", currencyLabel: "Currency", tabDirect: "I know my budget", tabCalc: "Help me calculate",
        budgetLabel: "Monthly Budget", budgetPlaceholder: "E.g. 2000", 
        incomeLabel: "Total Monthly Income",
        pctLongTerm: "Long Term Investment (%) - Rec: 20%",
        pctShortTerm: "Short Term Investment (%) - Rec: 10%",
        pctEdu: "Education (%) - Rec: 5%",
        pctSurvival: "Survival (%) - Rec: 55%",
        pctFree: "Free to Spend (%) - Rec: 10%",
        fixedPixLabel: "Committed Income (Bank Transfer/Cash)",
        calcResult: "Safe value to spend:",
        spentLabel: "Already spent?", btnStart: "Save and Continue", limitToday: "Today's Limit",
        remainsMonth: "Remaining", spentMonth: "Spent",
        addExpenseTitle: "Log Expense", amountPlaceholder: "Amount", descPlaceholder: "Description",
        btnAdd: "Add", btnEdit: "Save Edit", analysisTitle: "Spending Breakdown", expensesMonth: "History",
        btnExport: "Export", btnImport: "Import", btnReset: "Reset App", noExpenses: "No expenses.",
        prevExpense: "Previous Expense", alertReset: "🚨 ARE YOU SURE?", cat_comida: "Food",
        cat_transporte: "Transport", cat_supermercado: "Groceries", cat_cuentas: "Bills",
        cat_ocio: "Leisure", cat_otros: "Others", newCategory: "New Category", catNamePlaceholder: "Name (e.g., Gym)",
        catEmojiPlaceholder: "Emoji (e.g., 🏋️)", btnSave: "Save", errorBudget: "Please enter a budget greater than 0.",
        flouxVisionTitle: "FlouxVision - Invisible Loss", 
        lsimExplanation: "Opportunity cost is the money you miss out on earning by choosing to spend instead of invest. Calculate the true future cost of that purchase.",
        lsimAmount: "Initial Purchase Cost", 
        lsimYears: "Projected Years", 
        lsimHelpYears: "How long would the money be invested?",
        lsimRate: "Annual Return Rate", 
        lsimHelpRate: "Average market return (e.g., S&P 500 = 8-10%)",
        lsimCostLabel: "Spent Today:",
        lsimFutureLabel: "Future Value:",
        lsimTotalLoss: "You are losing ",
        lsimTotalLossEnd: " in potential gains.",
        btnOpenFlouxVision: "🔮 FlouxVision Simulator", 
        btnClose: "Close",
        paceLabel: "Pace vs. Calendar",
        menuAdjustBudget: "Adjust Budget",
        summaryTitle: "Monthly Summary", summaryPerf: "Performance:", summaryGreatest: "Largest Expense:", summaryDaily: "Daily Average:", summarySave: "Saved: ", summaryDeficit: "Deficit: "
    },
    pt: {
        appTitle: "Floux - ", currencyLabel: "Moeda", tabDirect: "Já sei meu orçamento", tabCalc: "Me ajuda calcular",
        budgetLabel: "Orçamento Mensal", budgetPlaceholder: "Ex: 2000", 
        incomeLabel: "Renda Mensal Total",
        pctLongTerm: "Investimento Longo Prazo (%) - Rec: 20%",
        pctShortTerm: "Investimento Curto Prazo (%) - Rec: 10%",
        pctEdu: "Educação (%) - Rec: 5%",
        pctSurvival: "Sobrevivência (%) - Rec: 55%",
        pctFree: "Gastos Livres (%) - Rec: 10%",
        fixedPixLabel: "Renda comprometida (PIX/Boleto)",
        calcResult: "Valor seguro para gastar:",
        spentLabel: "Já gastou algo?", btnStart: "Salvar e Continuar", limitToday: "Limite de hoje",
        remainsMonth: "Restante", spentMonth: "Gasto",
        addExpenseTitle: "Registrar Despesa", amountPlaceholder: "Valor", descPlaceholder: "Descrição",
        btnAdd: "Adicionar", btnEdit: "Salvar Edição", analysisTitle: "Análise de Gastos", expensesMonth: "Histórico",
        btnExport: "Exportar", btnImport: "Importar", btnReset: "Apagar App", noExpenses: "Sem despesas.",
        prevExpense: "Despesa Anterior", alertReset: "🚨 TEM CERTEZA?", cat_comida: "Comida",
        cat_transporte: "Transporte", cat_supermercado: "Mercado", cat_cuentas: "Contas",
        cat_ocio: "Lazer", cat_otros: "Outros", newCategory: "Nova Categoria", catNamePlaceholder: "Nome (ex: Academia)",
        catEmojiPlaceholder: "Emoji (ex: 🏋️)", btnSave: "Salvar", errorBudget: "Por favor, insira um orçamento maior que 0.",
        flouxVisionTitle: "FlouxVision - Perda Invisível", 
        lsimExplanation: "O custo de oportunidade é o dinheiro que você deixa de ganhar ao escolher gastar em vez de investir. Calcule o verdadeiro valor futuro dessa compra.",
        lsimAmount: "Custo Inicial da Compra", 
        lsimYears: "Anos Projetados", 
        lsimHelpYears: "Por quanto tempo o dinheiro ficaria investido?",
        lsimRate: "Taxa de Retorno Anual", 
        lsimHelpRate: "Retorno médio do mercado (ex: S&P 500 = 8-10%)",
        lsimCostLabel: "Gasto Hoje:",
        lsimFutureLabel: "Valor Futuro:",
        lsimTotalLoss: "Você está perdendo ",
        lsimTotalLossEnd: " em ganhos potenciais.",
        btnOpenFlouxVision: "🔮 Simulador FlouxVision", 
        btnClose: "Fechar",
        paceLabel: "Ritmo vs. Calendário",
        menuAdjustBudget: "Ajustar Orçamento",
        summaryTitle: "Resumo do Mês", summaryPerf: "Desempenho:", summaryGreatest: "Maior Despesa:", summaryDaily: "Média Diária:", summarySave: "Economia: ", summaryDeficit: "Déficit: "
    }
};

export let currentLang = localStorage.getItem(STORAGE_KEYS.LANG);

if (!currentLang) {
    const userLocale = navigator.language || navigator.userLanguage; 
    currentLang = userLocale.substring(0, 2); 
    if (!diccionario[currentLang]) { currentLang = 'en'; }
}

export function t(key) { 
    return diccionario[currentLang][key] || key; 
}

export function setLangStr(newLang) {
    currentLang = newLang;
    localStorage.setItem(STORAGE_KEYS.LANG, currentLang);
}