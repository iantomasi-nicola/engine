/* Synthetic data only: made-up foods, one recipe, a pantry and a 7-day plan. Never real user data. */
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plus = (n, from = new Date()) => { const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + n); return iso(d); };
const food = (id, name, kcal, p, c, f, pack, cat, role) => ({ id, name, brand: "", unit: "g", per: { kcal, p, c, f, fib: 0 }, servings: [], pack, cat, role, meals: ["m", "d"], source: "custom" });

function seed({ withPlan = true, withPantry = false } = {}) {
  const today = plus(0), days = {};
  if (withPlan) for (let i = 0; i < 7; i++) {
    const d = plus(i);
    days[d] = { date: d, meals: { m: [{ id: "it-bowl-" + i, kind: "recipe", ref: "t-bowl", qty: 2, eaten: false }], d: [{ id: "it-rice-" + i, kind: "food", ref: "t-rice", qty: 100, eaten: false }] } };
  }
  return {
    settings: { onboarded: true, fit: { profile: { sex: "Male", dob: "1990-06-15", height: 180, startWeight: 80, bf: null, maxHr: null } } },
    foods: {
      "t-rice": food("t-rice", "Test rice", 350, 7, 78, 1, 1000, "pantry", "C"),
      "t-chicken": food("t-chicken", "Test chicken", 110, 23, 0, 2, 400, "meat", "P"),
      "t-oil": food("t-oil", "Test oil", 900, 0, 0, 100, 500, "pantry", "F"),
    },
    recipes: { "t-bowl": { id: "t-bowl", name: "Test bowl", servings: 2, meals: ["m"], source: "custom", note: "", ingredients: [{ food: "t-rice", g: 200 }, { food: "t-chicken", g: 300 }, { food: "t-oil", g: 10 }] } },
    days,
    shop: { checked: {}, extras: [], pantry: withPantry ? { "t-rice": { g: 150 } } : {}, range: 7 },
  };
}
module.exports = { seed, plus, iso };
