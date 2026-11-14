// Category pool. Each daily game picks 6 categories and 4 cards from each.
// symbol = file name (without extension) in assets/symbols/, e.g. assets/symbols/apple.png
// tier: 1 = easy (all for now); harder categories can be added later with tier 2/3.
//
// Pool rules: every word and symbol id is unique across the whole pool, and no card
// may plausibly belong to another category (any 6 categories can appear together).
window.CATEGORIES = [
  { id: "fruit", theme: "Fruit", tier: 1, cards: [
      { word: "Apple", symbol: "apple" },
      { word: "Banana", symbol: "banana" },
      { word: "Pear", symbol: "pear" },
      { word: "Grapes", symbol: "grapes" },
      { word: "Pineapple", symbol: "pineapple" },
      { word: "Cherry", symbol: "cherry" }
  ]},
  { id: "vegetables", theme: "Vegetables", tier: 1, cards: [
      { word: "Carrot", symbol: "carrot" },
      { word: "Broccoli", symbol: "broccoli" },
      { word: "Onion", symbol: "onion" },
      { word: "Potato", symbol: "potato" },
      { word: "Garlic", symbol: "garlic" },
      { word: "Eggplant", symbol: "eggplant" }
  ]},
  { id: "farm-animals", theme: "Farm Animals", tier: 1, cards: [
      { word: "Cow", symbol: "cow" },
      { word: "Pig", symbol: "pig" },
      { word: "Sheep", symbol: "sheep" },
      { word: "Horse", symbol: "horse" },
      { word: "Goat", symbol: "goat" },
      { word: "Donkey", symbol: "donkey" }
  ]},
  { id: "sea-creatures", theme: "Sea Creatures", tier: 1, cards: [
      { word: "Octopus", symbol: "octopus" },
      { word: "Whale", symbol: "whale" },
      { word: "Jellyfish", symbol: "jellyfish" },
      { word: "Starfish", symbol: "starfish" },
      { word: "Shark", symbol: "shark" },
      { word: "Seahorse", symbol: "seahorse" }
  ]},
  { id: "insects", theme: "Insects", tier: 1, cards: [
      { word: "Bee", symbol: "bee" },
      { word: "Ant", symbol: "ant" },
      { word: "Butterfly", symbol: "butterfly" },
      { word: "Ladybug", symbol: "ladybug" },
      { word: "Grasshopper", symbol: "grasshopper" },
      { word: "Dragonfly", symbol: "dragonfly" }
  ]},
  { id: "birds", theme: "Birds", tier: 1, cards: [
      { word: "Owl", symbol: "owl" },
      { word: "Parrot", symbol: "parrot" },
      { word: "Eagle", symbol: "eagle" },
      { word: "Flamingo", symbol: "flamingo" },
      { word: "Swan", symbol: "swan" },
      { word: "Peacock", symbol: "peacock" }
  ]},
  { id: "safari-animals", theme: "Safari Animals", tier: 1, cards: [
      { word: "Lion", symbol: "lion" },
      { word: "Elephant", symbol: "elephant" },
      { word: "Giraffe", symbol: "giraffe" },
      { word: "Zebra", symbol: "zebra" },
      { word: "Rhino", symbol: "rhino" },
      { word: "Hippo", symbol: "hippo" }
  ]},
  { id: "tools", theme: "Tools", tier: 1, cards: [
      { word: "Hammer", symbol: "hammer" },
      { word: "Saw", symbol: "saw" },
      { word: "Screwdriver", symbol: "screwdriver" },
      { word: "Wrench", symbol: "wrench" },
      { word: "Pliers", symbol: "pliers" },
      { word: "Drill", symbol: "drill" }
  ]},
  { id: "instruments", theme: "Musical Instruments", tier: 1, cards: [
      { word: "Guitar", symbol: "guitar" },
      { word: "Drum", symbol: "drum" },
      { word: "Trumpet", symbol: "trumpet" },
      { word: "Violin", symbol: "violin" },
      { word: "Piano", symbol: "piano" },
      { word: "Harp", symbol: "harp" }
  ]},
  { id: "vehicles", theme: "Vehicles", tier: 1, cards: [
      { word: "Car", symbol: "car" },
      { word: "Bus", symbol: "bus" },
      { word: "Truck", symbol: "truck" },
      { word: "Train", symbol: "train" },
      { word: "Helicopter", symbol: "helicopter" },
      { word: "Motorcycle", symbol: "motorcycle" }
  ]},
  { id: "clothing", theme: "Clothing", tier: 1, cards: [
      { word: "Shirt", symbol: "shirt" },
      { word: "Dress", symbol: "dress" },
      { word: "Jeans", symbol: "jeans" },
      { word: "Skirt", symbol: "skirt" },
      { word: "Shorts", symbol: "shorts" },
      { word: "Socks", symbol: "socks" }
  ]},
  { id: "jewelry", theme: "Jewelry", tier: 1, cards: [
      { word: "Ring", symbol: "ring" },
      { word: "Necklace", symbol: "necklace" },
      { word: "Earrings", symbol: "earrings" },
      { word: "Bracelet", symbol: "bracelet" },
      { word: "Brooch", symbol: "brooch" },
      { word: "Tiara", symbol: "tiara" }
  ]},
  { id: "kitchen-utensils", theme: "Kitchen Utensils", tier: 1, cards: [
      { word: "Whisk", symbol: "whisk" },
      { word: "Ladle", symbol: "ladle" },
      { word: "Spatula", symbol: "spatula" },
      { word: "Grater", symbol: "grater" },
      { word: "Frying Pan", symbol: "frying-pan" },
      { word: "Colander", symbol: "colander" }
  ]},
  { id: "weather", theme: "Weather", tier: 1, cards: [
      { word: "Cloud", symbol: "cloud" },
      { word: "Lightning", symbol: "lightning" },
      { word: "Rainbow", symbol: "rainbow" },
      { word: "Tornado", symbol: "tornado" },
      { word: "Raindrop", symbol: "raindrop" },
      { word: "Snowflake", symbol: "snowflake" }
  ]},
  { id: "space", theme: "Space", tier: 1, cards: [
      { word: "Planet", symbol: "planet" },
      { word: "Moon", symbol: "moon" },
      { word: "Comet", symbol: "comet" },
      { word: "Satellite", symbol: "satellite" },
      { word: "Astronaut", symbol: "astronaut" },
      { word: "Telescope", symbol: "telescope" }
  ]},
  { id: "furniture", theme: "Furniture", tier: 1, cards: [
      { word: "Chair", symbol: "chair" },
      { word: "Table", symbol: "table" },
      { word: "Sofa", symbol: "sofa" },
      { word: "Bed", symbol: "bed" },
      { word: "Wardrobe", symbol: "wardrobe" },
      { word: "Bookshelf", symbol: "bookshelf" }
  ]},
  { id: "desserts", theme: "Desserts", tier: 1, cards: [
      { word: "Ice Cream", symbol: "ice-cream" },
      { word: "Cupcake", symbol: "cupcake" },
      { word: "Donut", symbol: "donut" },
      { word: "Cake", symbol: "cake" },
      { word: "Pudding", symbol: "pudding" },
      { word: "Popsicle", symbol: "popsicle" }
  ]},
  { id: "fast-food", theme: "Fast Food", tier: 1, cards: [
      { word: "Pizza", symbol: "pizza" },
      { word: "Burger", symbol: "burger" },
      { word: "Fries", symbol: "fries" },
      { word: "Hot Dog", symbol: "hot-dog" },
      { word: "Taco", symbol: "taco" },
      { word: "Sandwich", symbol: "sandwich" }
  ]},
  { id: "drinks", theme: "Drinks", tier: 1, cards: [
      { word: "Coffee", symbol: "coffee" },
      { word: "Tea", symbol: "tea" },
      { word: "Milk", symbol: "milk" },
      { word: "Juice", symbol: "juice" },
      { word: "Lemonade", symbol: "lemonade" },
      { word: "Smoothie", symbol: "smoothie" }
  ]},
  { id: "sports-equipment", theme: "Sports Equipment", tier: 1, cards: [
      { word: "Basketball", symbol: "basketball" },
      { word: "Racket", symbol: "racket" },
      { word: "Dumbbell", symbol: "dumbbell" },
      { word: "Hockey Stick", symbol: "hockey-stick" },
      { word: "Boxing Glove", symbol: "boxing-glove" },
      { word: "Bowling Pin", symbol: "bowling-pin" }
  ]},
  { id: "bathroom", theme: "Bathroom", tier: 1, cards: [
      { word: "Toothbrush", symbol: "toothbrush" },
      { word: "Toothpaste", symbol: "toothpaste" },
      { word: "Toilet", symbol: "toilet" },
      { word: "Bathtub", symbol: "bathtub" },
      { word: "Soap", symbol: "soap" },
      { word: "Shower", symbol: "shower" }
  ]},
  { id: "camping", theme: "Camping", tier: 1, cards: [
      { word: "Tent", symbol: "tent" },
      { word: "Campfire", symbol: "campfire" },
      { word: "Lantern", symbol: "lantern" },
      { word: "Sleeping Bag", symbol: "sleeping-bag" },
      { word: "Compass", symbol: "compass" },
      { word: "Binoculars", symbol: "binoculars" }
  ]},
  { id: "office-supplies", theme: "Office Supplies", tier: 1, cards: [
      { word: "Stapler", symbol: "stapler" },
      { word: "Paperclip", symbol: "paperclip" },
      { word: "Pencil", symbol: "pencil" },
      { word: "Eraser", symbol: "eraser" },
      { word: "Calculator", symbol: "calculator" },
      { word: "Pushpin", symbol: "pushpin" }
  ]},
  { id: "shapes", theme: "Shapes", tier: 1, cards: [
      { word: "Circle", symbol: "circle" },
      { word: "Square", symbol: "square" },
      { word: "Triangle", symbol: "triangle" },
      { word: "Heart", symbol: "heart" },
      { word: "Pentagon", symbol: "pentagon" },
      { word: "Hexagon", symbol: "hexagon" }
  ]}
];
