/**
 * Base TACO - Tabela Brasileira de Composição de Alimentos
 * Subset de alimentos comuns para substituições equivalentes mantendo macros.
 * Valores por 100g (parte comestível).
 * Fonte: NEPA/UNICAMP - Tabela TACO 4ª edição
 */

export interface TacoFood {
  name: string
  category: string
  energy_kcal: number
  protein_g: number
  lipid_g: number
  carbohydrate_g: number
}

/** Lista de alimentos TACO - categorias e macros por 100g */
export const TACO_FOODS: TacoFood[] = [
  // Cereais e derivados
  { name: 'Arroz, integral, cozido', category: 'Cereais e derivados', energy_kcal: 123.5, protein_g: 2.6, lipid_g: 1, carbohydrate_g: 25.8 },
  { name: 'Arroz, integral, cru', category: 'Cereais e derivados', energy_kcal: 359.7, protein_g: 7.3, lipid_g: 1.9, carbohydrate_g: 77.5 },
  { name: 'Arroz, tipo 1, cozido', category: 'Cereais e derivados', energy_kcal: 128.3, protein_g: 2.5, lipid_g: 0.2, carbohydrate_g: 28.1 },
  { name: 'Arroz, tipo 1, cru', category: 'Cereais e derivados', energy_kcal: 357.8, protein_g: 7.2, lipid_g: 0.3, carbohydrate_g: 78.8 },
  { name: 'Aveia, flocos, crua', category: 'Cereais e derivados', energy_kcal: 393.8, protein_g: 13.9, lipid_g: 8.5, carbohydrate_g: 66.6 },
  { name: 'Batata, doce, cozida', category: 'Cereais e derivados', energy_kcal: 76.8, protein_g: 0.6, lipid_g: 0.1, carbohydrate_g: 18.4 },
  { name: 'Batata, inglesa, cozida', category: 'Cereais e derivados', energy_kcal: 86.1, protein_g: 1.7, lipid_g: 0, carbohydrate_g: 20.1 },
  { name: 'Batata, inglesa, crua', category: 'Cereais e derivados', energy_kcal: 64.2, protein_g: 1.5, lipid_g: 0, carbohydrate_g: 14.9 },
  { name: 'Batata, inglesa, frita', category: 'Cereais e derivados', energy_kcal: 267.1, protein_g: 5, lipid_g: 13.1, carbohydrate_g: 35.6 },
  { name: 'Macarrão, trigo, cozido', category: 'Cereais e derivados', energy_kcal: 130.1, protein_g: 4.4, lipid_g: 0.7, carbohydrate_g: 26.6 },
  { name: 'Macarrão, trigo, cru', category: 'Cereais e derivados', energy_kcal: 371.1, protein_g: 10.3, lipid_g: 1.1, carbohydrate_g: 77.9 },
  { name: 'Mandioca, cozida', category: 'Cereais e derivados', energy_kcal: 125.6, protein_g: 0.6, lipid_g: 0.3, carbohydrate_g: 30.1 },
  { name: 'Mandioca, crua', category: 'Cereais e derivados', energy_kcal: 159.1, protein_g: 1.4, lipid_g: 0.3, carbohydrate_g: 38.1 },
  { name: 'Pão, trigo, forma, integral', category: 'Cereais e derivados', energy_kcal: 253.1, protein_g: 8.4, lipid_g: 3.7, carbohydrate_g: 49.2 },
  { name: 'Pão, trigo, francês', category: 'Cereais e derivados', energy_kcal: 300.4, protein_g: 8, lipid_g: 3.1, carbohydrate_g: 58.6 },
  { name: 'Polenta, pré-cozida', category: 'Cereais e derivados', energy_kcal: 114.6, protein_g: 2.2, lipid_g: 0.6, carbohydrate_g: 25.2 },
  { name: 'Tapioca, crua', category: 'Cereais e derivados', energy_kcal: 358.2, protein_g: 0.2, lipid_g: 0, carbohydrate_g: 88.7 },
  // Leguminosas
  { name: 'Feijão, carioca, cozido', category: 'Leguminosas', energy_kcal: 127, protein_g: 8.6, lipid_g: 0.5, carbohydrate_g: 23.4 },
  { name: 'Feijão, carioca, cru', category: 'Leguminosas', energy_kcal: 329.3, protein_g: 20.5, lipid_g: 1.2, carbohydrate_g: 62.5 },
  { name: 'Feijão, preto, cozido', category: 'Leguminosas', energy_kcal: 132.4, protein_g: 8.9, lipid_g: 0.5, carbohydrate_g: 23.7 },
  { name: 'Feijão, preto, cru', category: 'Leguminosas', energy_kcal: 343.5, protein_g: 21.4, lipid_g: 1.4, carbohydrate_g: 63.2 },
  { name: 'Lentilha, cozida', category: 'Leguminosas', energy_kcal: 93.4, protein_g: 6.9, lipid_g: 0.4, carbohydrate_g: 16.3 },
  { name: 'Lentilha, crua', category: 'Leguminosas', energy_kcal: 297.3, protein_g: 23.5, lipid_g: 1.1, carbohydrate_g: 52.7 },
  { name: 'Grão-de-bico, cozido', category: 'Leguminosas', energy_kcal: 164.2, protein_g: 8.9, lipid_g: 2.6, carbohydrate_g: 27.4 },
  { name: 'Grão-de-bico, cru', category: 'Leguminosas', energy_kcal: 355.1, protein_g: 21.2, lipid_g: 5.4, carbohydrate_g: 61.3 },
  { name: 'Soja, grão, cozido', category: 'Leguminosas', energy_kcal: 151.9, protein_g: 14, lipid_g: 6.2, carbohydrate_g: 11 },
  // Carnes e ovos
  { name: 'Carne, bovina, acém, magra, cozida', category: 'Carnes e derivados', energy_kcal: 214.5, protein_g: 31.3, lipid_g: 8.9, carbohydrate_g: 0 },
  { name: 'Carne, bovina, contrafilé, grelhado', category: 'Carnes e derivados', energy_kcal: 193.2, protein_g: 29.9, lipid_g: 7.3, carbohydrate_g: 0 },
  { name: 'Carne, bovina, patinho, cozido', category: 'Carnes e derivados', energy_kcal: 191.7, protein_g: 31.9, lipid_g: 5.7, carbohydrate_g: 0 },
  { name: 'Carne, bovina, coxão mole, cozido', category: 'Carnes e derivados', energy_kcal: 218.9, protein_g: 32.4, lipid_g: 9.2, carbohydrate_g: 0 },
  { name: 'Carne, frango, peito, sem pele, cozido', category: 'Carnes e derivados', energy_kcal: 164.7, protein_g: 31, lipid_g: 3.6, carbohydrate_g: 0 },
  { name: 'Carne, frango, coxa com pele, cozida', category: 'Carnes e derivados', energy_kcal: 215.1, protein_g: 26.8, lipid_g: 11.2, carbohydrate_g: 0 },
  { name: 'Carne, suína, lombo, cozido', category: 'Carnes e derivados', energy_kcal: 210.2, protein_g: 30.2, lipid_g: 8.8, carbohydrate_g: 0 },
  { name: 'Ovo, de galinha, inteiro, cozido', category: 'Ovos', energy_kcal: 155.5, protein_g: 13.3, lipid_g: 11.1, carbohydrate_g: 0.6 },
  { name: 'Ovo, de galinha, inteiro, cru', category: 'Ovos', energy_kcal: 143.1, protein_g: 12.6, lipid_g: 9.5, carbohydrate_g: 0.6 },
  // Peixes
  { name: 'Peixe, tilápia, filé, assado', category: 'Peixes e frutos do mar', energy_kcal: 128.4, protein_g: 26.2, lipid_g: 2.7, carbohydrate_g: 0 },
  { name: 'Peixe, salmão, filé, grelhado', category: 'Peixes e frutos do mar', energy_kcal: 212.9, protein_g: 26.9, lipid_g: 11.2, carbohydrate_g: 0 },
  { name: 'Atum, conserva em óleo', category: 'Peixes e frutos do mar', energy_kcal: 166.2, protein_g: 26.2, lipid_g: 5.8, carbohydrate_g: 0 },
  { name: 'Sardinha, enlatada em óleo', category: 'Peixes e frutos do mar', energy_kcal: 208.4, protein_g: 24.1, lipid_g: 11.5, carbohydrate_g: 0 },
  // Leites e derivados
  { name: 'Leite, integral', category: 'Leites e derivados', energy_kcal: 61.6, protein_g: 3.3, lipid_g: 3.3, carbohydrate_g: 4.8 },
  { name: 'Leite, desnatado', category: 'Leites e derivados', energy_kcal: 34.2, protein_g: 3.4, lipid_g: 0.1, carbohydrate_g: 4.9 },
  { name: 'Leite, semidesnatado', category: 'Leites e derivados', energy_kcal: 45.7, protein_g: 3.2, lipid_g: 1.5, carbohydrate_g: 4.9 },
  { name: 'Queijo, minas, frescal', category: 'Leites e derivados', energy_kcal: 264.5, protein_g: 17.4, lipid_g: 20.4, carbohydrate_g: 3.2 },
  { name: 'Queijo, mussarela', category: 'Leites e derivados', energy_kcal: 329.8, protein_g: 22.6, lipid_g: 25.2, carbohydrate_g: 3 },
  { name: 'Queijo, cottage', category: 'Leites e derivados', energy_kcal: 98.2, protein_g: 11.1, lipid_g: 4.3, carbohydrate_g: 3.4 },
  { name: 'Requeijão, cremoso', category: 'Leites e derivados', energy_kcal: 256.4, protein_g: 9.6, lipid_g: 23.4, carbohydrate_g: 4 },
  { name: 'Iogurte, natural, integral', category: 'Leites e derivados', energy_kcal: 61.2, protein_g: 3.5, lipid_g: 3.2, carbohydrate_g: 4.7 },
  { name: 'Iogurte, natural, desnatado', category: 'Leites e derivados', energy_kcal: 41.2, protein_g: 3.8, lipid_g: 0.3, carbohydrate_g: 5.8 },
  // Verduras e legumes
  { name: 'Alface, americana, crua', category: 'Verduras e legumes', energy_kcal: 8.9, protein_g: 0.6, lipid_g: 0.2, carbohydrate_g: 1.7 },
  { name: 'Brócolis, cozido', category: 'Verduras e legumes', energy_kcal: 25.5, protein_g: 2.1, lipid_g: 0.5, carbohydrate_g: 4.4 },
  { name: 'Brócolis, cru', category: 'Verduras e legumes', energy_kcal: 36.4, protein_g: 2.9, lipid_g: 0.3, carbohydrate_g: 7.2 },
  { name: 'Cenoura, cozida', category: 'Verduras e legumes', energy_kcal: 30.1, protein_g: 0.8, lipid_g: 0.2, carbohydrate_g: 6.9 },
  { name: 'Cenoura, crua', category: 'Verduras e legumes', energy_kcal: 34.1, protein_g: 0.9, lipid_g: 0.2, carbohydrate_g: 7.7 },
  { name: 'Couve, manteiga, refogada', category: 'Verduras e legumes', energy_kcal: 90.9, protein_g: 2.8, lipid_g: 7.5, carbohydrate_g: 5.2 },
  { name: 'Couve, manteiga, crua', category: 'Verduras e legumes', energy_kcal: 27.1, protein_g: 2.9, lipid_g: 0.5, carbohydrate_g: 4.3 },
  { name: 'Espinafre, refogado', category: 'Verduras e legumes', energy_kcal: 67.4, protein_g: 2.7, lipid_g: 5.6, carbohydrate_g: 3.6 },
  { name: 'Tomate, cru', category: 'Verduras e legumes', energy_kcal: 15.9, protein_g: 1.1, lipid_g: 0.2, carbohydrate_g: 3.1 },
  { name: 'Pepino, cru', category: 'Verduras e legumes', energy_kcal: 9.7, protein_g: 0.6, lipid_g: 0.1, carbohydrate_g: 2.2 },
  { name: 'Abobrinha, italiana, cozida', category: 'Verduras e legumes', energy_kcal: 15.2, protein_g: 1.1, lipid_g: 0.3, carbohydrate_g: 3.1 },
  // Frutas
  { name: 'Abacate, cru', category: 'Frutas', energy_kcal: 96.2, protein_g: 1.2, lipid_g: 8.4, carbohydrate_g: 6 },
  { name: 'Banana, nanica, crua', category: 'Frutas', energy_kcal: 91.6, protein_g: 1.3, lipid_g: 0.1, carbohydrate_g: 23.8 },
  { name: 'Banana, prata, crua', category: 'Frutas', energy_kcal: 98.3, protein_g: 1.4, lipid_g: 0.1, carbohydrate_g: 26 },
  { name: 'Laranja, pêra, crua', category: 'Frutas', energy_kcal: 37.4, protein_g: 0.8, lipid_g: 0.1, carbohydrate_g: 9.6 },
  { name: 'Maçã, fuji, com casca', category: 'Frutas', energy_kcal: 56.1, protein_g: 0.4, lipid_g: 0.2, carbohydrate_g: 15.2 },
  { name: 'Mamão, formosa, cru', category: 'Frutas', energy_kcal: 45.2, protein_g: 0.5, lipid_g: 0.2, carbohydrate_g: 11.6 },
  { name: 'Manga, tommy, crua', category: 'Frutas', energy_kcal: 51.9, protein_g: 0.4, lipid_g: 0.2, carbohydrate_g: 13.3 },
  { name: 'Melancia, crua', category: 'Frutas', energy_kcal: 30.1, protein_g: 0.9, lipid_g: 0.2, carbohydrate_g: 7.6 },
  { name: 'Morango, cru', category: 'Frutas', energy_kcal: 30.2, protein_g: 0.8, lipid_g: 0.3, carbohydrate_g: 7.2 },
  { name: 'Tangerina, ponkan, crua', category: 'Frutas', energy_kcal: 38.2, protein_g: 0.8, lipid_g: 0.1, carbohydrate_g: 9.6 },
  { name: 'Uva, itália, crua', category: 'Frutas', energy_kcal: 53.4, protein_g: 0.7, lipid_g: 0.2, carbohydrate_g: 13.6 },
  { name: 'Pera, williams, crua', category: 'Frutas', energy_kcal: 52.9, protein_g: 0.6, lipid_g: 0.2, carbohydrate_g: 14 },
  { name: 'Melão, cru', category: 'Frutas', energy_kcal: 29.4, protein_g: 0.7, lipid_g: 0.2, carbohydrate_g: 7.5 },
  // Óleos e gorduras
  { name: 'Óleo, de soja', category: 'Óleos e gorduras', energy_kcal: 884.2, protein_g: 0, lipid_g: 100, carbohydrate_g: 0 },
  { name: 'Óleo, de oliva', category: 'Óleos e gorduras', energy_kcal: 884.2, protein_g: 0, lipid_g: 100, carbohydrate_g: 0 },
  { name: 'Manteiga, sem sal', category: 'Óleos e gorduras', energy_kcal: 758.2, protein_g: 0.4, lipid_g: 84.4, carbohydrate_g: 0 },
  // Açúcares
  { name: 'Açúcar, refinado', category: 'Açúcares', energy_kcal: 386.9, protein_g: 0, lipid_g: 0, carbohydrate_g: 99.6 },
  { name: 'Mel', category: 'Açúcares', energy_kcal: 304, protein_g: 0, lipid_g: 0, carbohydrate_g: 82.4 },
  // Oleaginosas
  { name: 'Amendoim, cru', category: 'Oleaginosas', energy_kcal: 544.1, protein_g: 25.8, lipid_g: 43.7, carbohydrate_g: 21 },
  { name: 'Castanha-do-pará', category: 'Oleaginosas', energy_kcal: 656.3, protein_g: 14.5, lipid_g: 63.5, carbohydrate_g: 12.3 },
  { name: 'Castanha de caju', category: 'Oleaginosas', energy_kcal: 553.2, protein_g: 18.5, lipid_g: 43.9, carbohydrate_g: 29.2 },
  { name: 'Nozes', category: 'Oleaginosas', energy_kcal: 656.4, protein_g: 14.4, lipid_g: 61.5, carbohydrate_g: 13.7 },
]

/** Busca alimentos TACO por nome (case-insensitive, parcial) */
export function searchTacoFoods(query: string, limit = 15): TacoFood[] {
  if (!query || query.trim().length < 2) return []
  const q = query.toLowerCase().trim()
  return TACO_FOODS.filter(f =>
    f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)
  ).slice(0, limit)
}

/**
 * Calcula quantidade equivalente do substituto para manter as mesmas calorias.
 * Base: kcal_original, quantidade e unidade do alimento.
 * Retorna { quantity, unit } - quantidade em g quando possível.
 */
export function calcEquivalentQuantity(
  originalCalories: number,
  substituteFood: TacoFood,
  preferredUnit: string = 'g'
): { quantity: string; unit: string } {
  if (!originalCalories || originalCalories <= 0 || substituteFood.energy_kcal <= 0) {
    return { quantity: '', unit: preferredUnit }
  }
  // qtd em gramas para manter calorias: (kcal_original / kcal_por_100g) * 100
  const qtdG = (originalCalories / substituteFood.energy_kcal) * 100
  const rounded = Math.round(qtdG)
  return {
    quantity: String(rounded),
    unit: preferredUnit === 'g' || preferredUnit === 'ml' ? preferredUnit : 'g',
  }
}
