/* =================================================================
   Mimshak Pak — Quote calculator pricing
   -----------------------------------------------------------------
   THESE ARE THE NUMBERS THE CALCULATOR USES TO WORK OUT ESTIMATES.

   They are starting figures only. Replace them with Mimshak Pak's real
   costs — either by editing this file, or from the admin panel under
   Finance > Pricing, which saves straight back to this file.

   Every amount is in Naira (NGN).
   ================================================================= */
window.MPQ_RATES = {

  /* ---------- Printed cartons ---------- */
  carton: {
    /* Cost of board per square metre, by wall type. */
    boardPerSqm: {
      single: 420,      // 3-ply / single wall — light products
      double: 680       // 5-ply / double wall — heavier or stacked goods
    },

    /* Printing cost per square metre, per colour. */
    printPerSqmPerColour: 40,

    /* Gloss or matt lamination, per square metre. Only added if chosen. */
    laminationPerSqm: 95,

    /* One-off setup costs. These are spread across the whole order, so
       they make small orders cost more per unit than large ones. */
    platePerColour: 25000,   // printing plate, one per colour
    dieCutSetup: 35000,      // cutting die for a custom shape

    /* Glue flap added to the blank width when working out material use. */
    glueFlapCm: 4,

    wastagePercent: 8,       // board lost to trimming and set-up sheets
    marginPercent: 25,       // Mimshak Pak's margin
    minQuantity: 500
  },

  /* ---------- Nylon / poly packaging ---------- */
  nylon: {
    /* Raw material cost per kilogram, by film type. */
    materialPerKg: {
      ldpe: 2100,       // soft, flexible — bread, general bagging
      hdpe: 2000,       // crinkly, stronger — shopping bags
      pp:   2300        // clear and glossy — retail presentation
    },

    /* Density in g/cm3 — used to turn bag size into weight. Do not
       change these unless your supplier quotes different figures. */
    densityGPerCm3: { ldpe: 0.92, hdpe: 0.95, pp: 0.90 },

    /* Printing cost per kilogram, per colour. */
    printPerKgPerColour: 320,

    /* One-off printing cylinder, one per colour. Spread across the order. */
    cylinderPerColour: 45000,

    wastagePercent: 10,
    marginPercent: 25,
    minQuantity: 1000
  },

  /* ---------- Quantity discounts ----------
     Bigger orders cost less per unit. "from" is the order size at which
     that discount starts applying. */
  volumeBreaks: [
    { from: 0,     discountPercent: 0  },
    { from: 2000,  discountPercent: 4  },
    { from: 5000,  discountPercent: 8  },
    { from: 10000, discountPercent: 12 },
    { from: 25000, discountPercent: 16 }
  ],

  /* ---------- How the estimate is shown ----------
     The calculator shows a range rather than one figure, because the real
     price depends on artwork, finishing and current board prices. 12 means
     the range runs from 12% below to 12% above the calculated figure. */
  rangeSpreadPercent: 12,

  /* Shown under every estimate. */
  disclaimer: "This is an automatic estimate based on typical production costs. " +
              "Your final price depends on your artwork, finishing and current material prices. " +
              "Send us the spec for a firm quote — it is free and there is no obligation."
};
