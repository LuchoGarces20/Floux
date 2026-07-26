import { STORAGE_KEYS } from './store.js';

export const diccionario = {
    es: {
        appTitle: "Floux - ", currencyLabel: "Moneda", tabDirect: "Ya sé mi presupuesto", tabCalc: "Ayúdame a calcular",
        budgetLabel: "Presupuesto total para gastar mensualmente", budgetPlaceholder: "Ej: 2000", incomeLabel: "Renta Mensual Total",
        adjustPercentages: "Ajustar porcentajes recomendados",
        pctLongTerm: "Inversión Largo Plazo (%) - Rec: 20%", pctShortTerm: "Inversión Corto Plazo (%) - Rec: 10%",
        pctEdu: "Educación (%) - Rec: 5%", pctSurvival: "Supervivencia (%) - Rec: 55%", pctFree: "Gastos Libres (%) - Rec: 10%",
        calcResult: "Valor seguro para gastar:", netSurvival: "Supervivencia Líquida:", freeSpending: "Teto Gastos Libres:",
        spentLabel: "¿Ya gastaste algo?", btnStart: "Guardar y Continuar", limitToday: "Tu límite de hoy",
        remainsMonth: "Liquidez", spentMonth: "Gastado", addExpenseTitle: "Registrar Gasto", amountPlaceholder: "Monto", descPlaceholder: "Descripción", selectCategory: "Selecciona una categoría",
        btnAdd: "Agregar", btnEdit: "Guardar Edición", analysisTitle: "Distribución de Gastos", expensesMonth: "Historial",
        btnExport: "Exportar", btnImport: "Importar", btnReset: "Borrar App", noExpenses: "Sin gastos.",
        prevExpense: "Gasto Previo", alertReset: "⚠️ ¿SEGURO?", cat_comida: "Comida",
        cat_transporte: "Transporte", cat_supermercado: "Super", cat_cuentas: "Cuentas",
        cat_ocio: "Ocio", cat_otros: "Otros", newCategory: "Nueva Categoría", catNamePlaceholder: "Nombre (ej: Gimnasio)",
        catEmojiPlaceholder: "Emoji (ej: 🏋️)", btnSave: "Guardar", errorBudget: "Por favor ingresa un presupuesto mayor a 0.",
        flouxVisionTitle: "FlouxVision - Pérdida Invisible", lsimExplanation: "El costo de oportunidad es el dinero que dejas de ganar al elegir gastar en lugar de invertir. Calcula el valor real a futuro de esa compra.",
        lsimAmount: "Costo Inicial de la Compra", lsimYears: "Años Proyectados", lsimHelpYears: "¿Cuánto tiempo el dinero estaría invirtiéndose?",
        lsimRate: "Tasa de Rendimiento Anual", lsimHelpRate: "Retorno promedio del mercado (ej. S&P 500 = 8-10%)",
        lsimCostLabel: "Gasto Hoy:", lsimFutureLabel: "Valor Futuro:", lsimTotalLoss: "Estás perdiendo ", lsimTotalLossEnd: " en ganancias potenciales.",
        btnOpenFlouxVision: "Simulador FlouxVision", btnClose: "Cerrar", menuAdjustBudget: "Ajustar Presupuesto",
        emptyStateTitle: "¡Un nuevo mes!", emptyStateMsg: "Recuerda: el dinero que no gastas hoy aumenta automáticamente tu límite de mañana.<br><br>Registra tu primer gasto.",
        summaryTitle: "Resumen del Mes", summaryPerf: "Rendimiento:", summaryGreatest: "Gasto Mayor:", summaryDaily: "Promedio Diario:", summarySave: "Ahorro: ", summaryDeficit: "Déficit: ",
        installmentsLabel: "Cuotas / Parcelas", ccClosingLabel: "Día de Cierre de Tarjeta (TC)", ccClosingPh: "Día Cierre (ej: 24)", installments_1: "1x (Al contado)", installments_custom: "Otro...",
        menuAccounts: "Cuentas y Tarjetas", accountsTitle: "Cuentas", accountNamePh: "Nombre de la cuenta (ej. Nubank)",
        accTypeCash: "Efectivo / Débito", accTypeCredit: "Tarjeta de Crédito", btnAddAccount: "Agregar Cuenta", selectAccountLabel: "Cuenta de Origen",
        menuBills: "Gastos Fijos", billsTitle: "Boletos / Gastos Fijos", dueDateLabel: "Día de Vencimiento en el mes (1-31)", btnAddBill: "Agregar Gasto",
        billsExplanation: "Registra tus gastos fijos. Floux los restará automáticamente de tu liquidez antes de calcular tu límite diario.", billsExplanationShort: "Ingresa tus cuentas (Ej: Alquiler, Luz).",
        wizardStep1Title: "Moneda y Presupuesto", wizardStep2Title: "Cuentas y Tarjetas", wizardStep2Desc: "Agrega tus cuentas corrientes o tarjetas de crédito para organizar tus pagos.",
        wizardStep3Title: "Ajustes Finales", wizardNextAccounts: "Siguiente: Cuentas ➡️", wizardNextFinal: "Siguiente ➡️", wizardBack: "⬅️ Volver", wizardFinish: "Concluir 🚀",
        btnDeleteAria: "Eliminar", errFileSize: "Error: El archivo excede el tamaño máximo permitido (5MB).",
        errFormat: "Error: El archivo no tiene el formato correcto.", errInvalid: "Error: Archivo inválido o corrupto.",
        confirmOverwrite: "Aceptar: Sobrescribir todos los datos.\nCancelar: Combinar con datos actuales.",
        confirmDeleteAllInst: "Este gasto es una cuota.\n\n¿Deseas eliminar TODAS las cuotas asociadas?\n\n[Aceptar] = Eliminar TODAS\n[Cancelar] = Eliminar SOLO esta",
        toastAllDeleted: "Todas las cuotas eliminadas", toastDeleted: "Eliminado",
        
        // Net Worth
        accTypeInvestment: "Inversión / Patrimonio", nwTitle: "Evolución del Patrimonio", nwExplanation: "Rastrea el crecimiento de tus inversiones a lo largo del tiempo.", 
        nwTotalLabel: "Patrimonio Total", nwVarLabel: "Variación", nwUpdateFormTitle: "Actualizar Inversión", 
        nwSelectAcc: "Activo / Cuenta", nwAmountPh: "Nuevo Saldo (Total)", nwEmpty: "Agrega una cuenta de inversión y actualiza su saldo para ver tu gráfico."
    },
    en: {
        appTitle: "Floux - ", currencyLabel: "Currency", tabDirect: "I know my budget", tabCalc: "Help me calculate",
        budgetLabel: "Total monthly budget to spend", budgetPlaceholder: "E.g. 2000", incomeLabel: "Total Monthly Income",
        adjustPercentages: "Adjust recommended percentages",
        pctLongTerm: "Long Term Investment (%) - Rec: 20%", pctShortTerm: "Short Term Investment (%) - Rec: 10%",
        pctEdu: "Education (%) - Rec: 5%", pctSurvival: "Survival (%) - Rec: 55%", pctFree: "Free to Spend (%) - Rec: 10%",
        calcResult: "Safe value to spend:", netSurvival: "Net Survival:", freeSpending: "Free Spending Cap:",
        spentLabel: "Already spent?", btnStart: "Save and Continue", limitToday: "Today's Limit", remainsMonth: "Liquidity", spentMonth: "Spent",
        addExpenseTitle: "Log Expense", amountPlaceholder: "Amount", descPlaceholder: "Description", selectCategory: "Select a category",
        btnAdd: "Add", btnEdit: "Save Edit", analysisTitle: "Spending Breakdown", expensesMonth: "History",
        btnExport: "Export", btnImport: "Import", btnReset: "Reset App", noExpenses: "No expenses.", prevExpense: "Previous Expense", alertReset: "⚠️ ARE YOU SURE?", cat_comida: "Food",
        cat_transporte: "Transport", cat_supermercado: "Groceries", cat_cuentas: "Bills", cat_ocio: "Leisure", cat_otros: "Others", newCategory: "New Category", catNamePlaceholder: "Name (e.g., Gym)",
        catEmojiPlaceholder: "Emoji (e.g., 🏋️)", btnSave: "Save", errorBudget: "Please enter a budget greater than 0.",
        flouxVisionTitle: "FlouxVision - Invisible Loss", lsimExplanation: "Opportunity cost is the money you miss out on earning by choosing to spend instead of invest. Calculate the true future cost of that purchase.",
        lsimAmount: "Initial Purchase Cost", lsimYears: "Projected Years", lsimHelpYears: "How long would the money be invested?",
        lsimRate: "Annual Return Rate", lsimHelpRate: "Average market return (e.g., S&P 500 = 8-10%)",
        lsimCostLabel: "Spent Today:", lsimFutureLabel: "Future Value:", lsimTotalLoss: "You are losing ", lsimTotalLossEnd: " in potential gains.",
        btnOpenFlouxVision: "FlouxVision Simulator", btnClose: "Close", menuAdjustBudget: "Adjust Budget",
        emptyStateTitle: "A new month!", emptyStateMsg: "Remember: the money you don't spend today automatically increases tomorrow's limit.<br><br>Log your first expense.",
        summaryTitle: "Monthly Summary", summaryPerf: "Performance:", summaryGreatest: "Largest Expense:", summaryDaily: "Daily Average:", summarySave: "Saved: ", summaryDeficit: "Deficit: ",
        installmentsLabel: "Installments", ccClosingLabel: "Credit Card Closing Day", ccClosingPh: "Closing Day (e.g. 24)", installments_1: "1x (Single Payment)", installments_custom: "Other...",
        menuAccounts: "Accounts & Cards", accountsTitle: "Accounts", accountNamePh: "Account name (e.g. Chase)",
        accTypeCash: "Cash / Debit", accTypeCredit: "Credit Card", btnAddAccount: "Add Account", selectAccountLabel: "Funding Source",
        menuBills: "Fixed Expenses", billsTitle: "Fixed Bills", dueDateLabel: "Due Day in month (1-31)", btnAddBill: "Add Bill",
        billsExplanation: "Log your fixed bills. Floux will automatically subtract them from your liquidity before calculating your daily limit.", billsExplanationShort: "Enter your bills (e.g. Rent, Energy).",
        wizardStep1Title: "Currency & Budget", wizardStep2Title: "Accounts & Cards", wizardStep2Desc: "Add your checking accounts or credit cards to organize payments.",
        wizardStep3Title: "Final Adjustments", wizardNextAccounts: "Next: Accounts ➡️", wizardNextFinal: "Next ➡️", wizardBack: "⬅️ Back", wizardFinish: "Finish 🚀",
        btnDeleteAria: "Delete", errFileSize: "Error: File exceeds the maximum allowed size (5MB).",
        errFormat: "Error: Incorrect file format.", errInvalid: "Error: Invalid or corrupt file.",
        confirmOverwrite: "OK: Overwrite all data.\nCancel: Merge with current data.",
        confirmDeleteAllInst: "This expense is an installment.\n\nDo you want to delete ALL associated installments?\n\n[OK] = Delete ALL\n[Cancel] = Delete ONLY this one",
        toastAllDeleted: "All installments deleted", toastDeleted: "Deleted",

        // Net Worth
        accTypeInvestment: "Investment / Wealth", nwTitle: "Net Worth Evolution", nwExplanation: "Track your investment growth over time.", 
        nwTotalLabel: "Total Net Worth", nwVarLabel: "Variation", nwUpdateFormTitle: "Update Investment", 
        nwSelectAcc: "Asset / Account", nwAmountPh: "New Balance (Total)", nwEmpty: "Add an investment account and update its balance to see your chart."
    },
    pt: {
        appTitle: "Floux - ", currencyLabel: "Moeda", tabDirect: "Já sei meu orçamento", tabCalc: "Me ajuda calcular",
        budgetLabel: "Orçamento total para gastar mensalmente", budgetPlaceholder: "Ex: 2000", incomeLabel: "Renda Mensal Total",
        adjustPercentages: "Ajustar porcentagens recomendadas",
        pctLongTerm: "Investimento Longo Prazo (%) - Rec: 20%", pctShortTerm: "Investimento Curto Prazo (%) - Rec: 10%",
        pctEdu: "Educação (%) - Rec: 5%", pctSurvival: "Sobrevivência (%) - Rec: 55%", pctFree: "Gastos Libres (%) - Rec: 10%",
        calcResult: "Valor seguro para gastar:", netSurvival: "Sobrevivência Líquida:", freeSpending: "Teto Gastos Livres:",
        spentLabel: "Já gastou algo?", btnStart: "Salvar e Continuar", limitToday: "Limite de hoje", remainsMonth: "Liquidez", spentMonth: "Gasto",
        addExpenseTitle: "Registrar Despesa", amountPlaceholder: "Valor", descPlaceholder: "Descrição", selectCategory: "Selecione uma categoria",
        btnAdd: "Adicionar", btnEdit: "Salvar Edição", analysisTitle: "Análise de Gastos", expensesMonth: "Histórico",
        btnExport: "Exportar", btnImport: "Importar", btnReset: "Apagar App", noExpenses: "Sem despesas.", prevExpense: "Despesa Anterior", alertReset: "⚠️ TEM CERTEZA?", cat_comida: "Comida",
        cat_transporte: "Transporte", cat_supermercado: "Mercado", cat_cuentas: "Contas", cat_ocio: "Lazer", cat_otros: "Outros", newCategory: "Nova Categoria", catNamePlaceholder: "Nome (ex: Academia)",
        catEmojiPlaceholder: "Emoji (ex: 🏋️)", btnSave: "Salvar", errorBudget: "Por favor, insira um orçamento maior que 0.",
        flouxVisionTitle: "FlouxVision - Perda Invisível", lsimExplanation: "O custo de oportunidade é o dinheiro que você deixa de ganhar ao escolher gastar em vez de investir. Calcule o verdadeiro valor futuro dessa compra.",
        lsimAmount: "Custo Inicial da Compra", lsimYears: "Anos Projetados", lsimHelpYears: "Por quanto tempo o dinheiro ficaria investido?",
        lsimRate: "Taxa de Retorno Anual", lsimHelpRate: "Retorno médio do mercado (ex: S&P 500 = 8-10%)",
        lsimCostLabel: "Gasto Hoje:", lsimFutureLabel: "Valor Futuro:", lsimTotalLoss: "Você está perdendo ", lsimTotalLossEnd: " em ganhos potenciais.",
        btnOpenFlouxVision: "Simulador FlouxVision", btnClose: "Fechar", menuAdjustBudget: "Ajustar Orçamento",
        emptyStateTitle: "Um novo mês!", emptyStateMsg: "Lembre-se: o dinheiro que você não gasta hoje aumenta automaticamente seu limite de amanhã.<br><br>Registre seu primeiro gasto.",
        summaryTitle: "Resumo do Mês", summaryPerf: "Desempenho:", summaryGreatest: "Maior Despesa:", summaryDaily: "Média Diária:", summarySave: "Economia: ", summaryDeficit: "Déficit: ",
        installmentsLabel: "Parcelas", ccClosingLabel: "Dia de Fechamento do Cartão (TC)", ccClosingPh: "Dia Fech. (ex: 24)", installments_1: "1x (À vista)", installments_custom: "Outro...",
        menuAccounts: "Contas e Cartões", accountsTitle: "Contas", accountNamePh: "Nome da conta (ex. Nubank)",
        accTypeCash: "Dinheiro / Débito", accTypeCredit: "Cartão de Crédito", btnAddAccount: "Adicionar Conta", selectAccountLabel: "Conta / Origem",
        menuBills: "Gastos Fixos", billsTitle: "Boletos / Gastos Fixos", dueDateLabel: "Dia de Vencimento no mês (1-31)", btnAddBill: "Adicionar Boleto",
        billsExplanation: "Registre seus gastos fixos. O Floux os subtrairá automaticamente da sua liquidez antes de calcular seu limite diário.", billsExplanationShort: "Insira suas contas (Ex: Aluguel, Luz).",
        wizardStep1Title: "Moeda e Orçamento", wizardStep2Title: "Contas e Cartões", wizardStep2Desc: "Adicione suas contas correntes ou cartões de crédito para organizar os pagamentos.",
        wizardStep3Title: "Ajustes Finais", wizardNextAccounts: "Próximo: Contas ➡️", wizardNextFinal: "Próximo ➡️", wizardBack: "⬅️ Voltar", wizardFinish: "Concluir 🚀",
        btnDeleteAria: "Apagar", errFileSize: "Erro: O arquivo excede o tamanho máximo permitido (5MB).",
        errFormat: "Erro: O arquivo não tem o formato correto.", errInvalid: "Erro: Arquivo inválido ou corrompido.",
        confirmOverwrite: "OK: Sobrescrever todos os dados.\nCancelar: Combinar com os dados atuais.",
        confirmDeleteAllInst: "Este gasto é uma parcela.\n\nDeseja apagar TODAS as parcelas associadas?\n\n[OK] = Apagar TODAS\n[Cancelar] = Apagar APENAS esta",
        toastAllDeleted: "Todas as parcelas eliminadas", toastDeleted: "Eliminado",

        // Net Worth
        accTypeInvestment: "Investimento / Patrimônio", nwTitle: "Evolução do Patrimônio", nwExplanation: "Acompanhe o crescimento dos seus investimentos ao longo do tempo.", 
        nwTotalLabel: "Patrimônio Total", nwVarLabel: "Variação", nwUpdateFormTitle: "Atualizar Investimento", 
        nwSelectAcc: "Ativo / Conta", nwAmountPh: "Novo Saldo (Total)", nwEmpty: "Adicione uma conta de investimento e atualize o saldo para ver seu gráfico."
    }
};

export let currentLang = localStorage.getItem(STORAGE_KEYS.LANG) || (navigator.language || navigator.userLanguage).substring(0, 2);
if (!diccionario[currentLang]) { currentLang = 'en'; }

export function t(key) {
    return diccionario[currentLang][key] || key;
}

export function setLangStr(newLang) {
    currentLang = newLang;
    localStorage.setItem(STORAGE_KEYS.LANG, currentLang);
}

export function formatCurrency(cents, currencyCode, langStr = currentLang) {
    const localeStr = langStr === 'es' ? 'es-ES' : (langStr === 'pt' ? 'pt-BR' : 'en-US');
    return new Intl.NumberFormat(localeStr, { style: 'currency', currency: currencyCode }).format(cents / 100);
}