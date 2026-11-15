// Category pool. Each daily game picks 8 categories and 4 cards from each (plus one
// category card per category, showing theme / themeDe and symbol category-<id>).
// symbol = file name (without extension) in assets/symbols/, e.g. assets/symbols/apple.png
// tier: 1 = easy (all for now); harder categories can be added later with tier 2/3.
// theme / word     = English category name / card word.
// themeDe / wordDe = German category name / card word (German nouns capitalised).
//   Symbols are shared between languages, so a card has one symbol for both words.
//
// Pool rules: every word (per language) and symbol id is unique across the whole pool,
// and no card may plausibly belong to another category in either language (any 8
// categories can appear together). Keep card words short (max ~14 characters).
// This file is UTF-8 (German umlauts are stored as real characters).
window.CATEGORIES = [
  { id: "fruit", theme: "Fruit", themeDe: "Obst", tier: 1, cards: [
      { word: "Apple", wordDe: "Apfel", symbol: "apple" },
      { word: "Banana", wordDe: "Banane", symbol: "banana" },
      { word: "Pear", wordDe: "Birne", symbol: "pear" },
      { word: "Grapes", wordDe: "Weintrauben", symbol: "grapes" },
      { word: "Pineapple", wordDe: "Ananas", symbol: "pineapple" },
      { word: "Cherry", wordDe: "Kirsche", symbol: "cherry" }
  ]},
  { id: "vegetables", theme: "Vegetables", themeDe: "Gemüse", tier: 1, cards: [
      { word: "Carrot", wordDe: "Karotte", symbol: "carrot" },
      { word: "Broccoli", wordDe: "Brokkoli", symbol: "broccoli" },
      { word: "Onion", wordDe: "Zwiebel", symbol: "onion" },
      { word: "Potato", wordDe: "Kartoffel", symbol: "potato" },
      { word: "Garlic", wordDe: "Knoblauch", symbol: "garlic" },
      { word: "Eggplant", wordDe: "Aubergine", symbol: "eggplant" }
  ]},
  { id: "farm-animals", theme: "Farm Animals", themeDe: "Bauernhof­tiere", tier: 1, cards: [
      { word: "Cow", wordDe: "Kuh", symbol: "cow" },
      { word: "Pig", wordDe: "Schwein", symbol: "pig" },
      { word: "Sheep", wordDe: "Schaf", symbol: "sheep" },
      { word: "Horse", wordDe: "Pferd", symbol: "horse" },
      { word: "Goat", wordDe: "Ziege", symbol: "goat" },
      { word: "Donkey", wordDe: "Esel", symbol: "donkey" }
  ]},
  { id: "sea-creatures", theme: "Sea Creatures", themeDe: "Meerestiere", tier: 1, cards: [
      { word: "Octopus", wordDe: "Krake", symbol: "octopus" },
      { word: "Whale", wordDe: "Wal", symbol: "whale" },
      { word: "Jellyfish", wordDe: "Qualle", symbol: "jellyfish" },
      { word: "Starfish", wordDe: "Seestern", symbol: "starfish" },
      { word: "Shark", wordDe: "Hai", symbol: "shark" },
      { word: "Seahorse", wordDe: "Seepferdchen", symbol: "seahorse" }
  ]},
  { id: "insects", theme: "Insects", themeDe: "Insekten", tier: 1, cards: [
      { word: "Bee", wordDe: "Biene", symbol: "bee" },
      { word: "Ant", wordDe: "Ameise", symbol: "ant" },
      { word: "Butterfly", wordDe: "Schmetterling", symbol: "butterfly" },
      { word: "Ladybug", wordDe: "Marienkäfer", symbol: "ladybug" },
      { word: "Grasshopper", wordDe: "Heuschrecke", symbol: "grasshopper" },
      { word: "Dragonfly", wordDe: "Libelle", symbol: "dragonfly" }
  ]},
  { id: "birds", theme: "Birds", themeDe: "Vögel", tier: 1, cards: [
      { word: "Owl", wordDe: "Eule", symbol: "owl" },
      { word: "Parrot", wordDe: "Papagei", symbol: "parrot" },
      { word: "Eagle", wordDe: "Adler", symbol: "eagle" },
      { word: "Flamingo", wordDe: "Flamingo", symbol: "flamingo" },
      { word: "Swan", wordDe: "Schwan", symbol: "swan" },
      { word: "Peacock", wordDe: "Pfau", symbol: "peacock" }
  ]},
  { id: "safari-animals", theme: "Safari Animals", themeDe: "Safaritiere", tier: 1, cards: [
      { word: "Lion", wordDe: "Löwe", symbol: "lion" },
      { word: "Elephant", wordDe: "Elefant", symbol: "elephant" },
      { word: "Giraffe", wordDe: "Giraffe", symbol: "giraffe" },
      { word: "Zebra", wordDe: "Zebra", symbol: "zebra" },
      { word: "Rhino", wordDe: "Nashorn", symbol: "rhino" },
      { word: "Hippo", wordDe: "Nilpferd", symbol: "hippo" }
  ]},
  { id: "tools", theme: "Tools", themeDe: "Werkzeug", tier: 1, cards: [
      { word: "Hammer", wordDe: "Hammer", symbol: "hammer" },
      { word: "Saw", wordDe: "Säge", symbol: "saw" },
      { word: "Screwdriver", wordDe: "Schraubendreher", symbol: "screwdriver" },
      { word: "Wrench", wordDe: "Maulschlüssel", symbol: "wrench" },
      { word: "Pliers", wordDe: "Zange", symbol: "pliers" },
      { word: "Drill", wordDe: "Bohrmaschine", symbol: "drill" }
  ]},
  { id: "instruments", theme: "Musical Instruments", themeDe: "Musik­instrumente", tier: 1, cards: [
      { word: "Guitar", wordDe: "Gitarre", symbol: "guitar" },
      { word: "Drum", wordDe: "Trommel", symbol: "drum" },
      { word: "Trumpet", wordDe: "Trompete", symbol: "trumpet" },
      { word: "Violin", wordDe: "Geige", symbol: "violin" },
      { word: "Piano", wordDe: "Klavier", symbol: "piano" },
      { word: "Harp", wordDe: "Harfe", symbol: "harp" }
  ]},
  { id: "vehicles", theme: "Vehicles", themeDe: "Fahrzeuge", tier: 1, cards: [
      { word: "Car", wordDe: "Auto", symbol: "car" },
      { word: "Bus", wordDe: "Bus", symbol: "bus" },
      { word: "Truck", wordDe: "Lastwagen", symbol: "truck" },
      { word: "Train", wordDe: "Zug", symbol: "train" },
      { word: "Helicopter", wordDe: "Hubschrauber", symbol: "helicopter" },
      { word: "Motorcycle", wordDe: "Motorrad", symbol: "motorcycle" }
  ]},
  { id: "clothing", theme: "Clothing", themeDe: "Kleidung", tier: 1, cards: [
      { word: "Shirt", wordDe: "Hemd", symbol: "shirt" },
      { word: "Dress", wordDe: "Kleid", symbol: "dress" },
      { word: "Jeans", wordDe: "Jeans", symbol: "jeans" },
      { word: "Skirt", wordDe: "Rock", symbol: "skirt" },
      { word: "Shorts", wordDe: "Shorts", symbol: "shorts" },
      { word: "Socks", wordDe: "Socken", symbol: "socks" }
  ]},
  { id: "jewelry", theme: "Jewelry", themeDe: "Schmuck", tier: 1, cards: [
      { word: "Ring", wordDe: "Ring", symbol: "ring" },
      { word: "Necklace", wordDe: "Halskette", symbol: "necklace" },
      { word: "Earrings", wordDe: "Ohrringe", symbol: "earrings" },
      { word: "Bracelet", wordDe: "Armband", symbol: "bracelet" },
      { word: "Brooch", wordDe: "Brosche", symbol: "brooch" },
      { word: "Tiara", wordDe: "Diadem", symbol: "tiara" }
  ]},
  { id: "kitchen-utensils", theme: "Kitchen Utensils", themeDe: "Küchen­utensilien", tier: 1, cards: [
      { word: "Whisk", wordDe: "Schneebesen", symbol: "whisk" },
      { word: "Ladle", wordDe: "Schöpfkelle", symbol: "ladle" },
      { word: "Spatula", wordDe: "Pfannenwender", symbol: "spatula" },
      { word: "Grater", wordDe: "Reibe", symbol: "grater" },
      { word: "Frying Pan", wordDe: "Bratpfanne", symbol: "frying-pan" },
      { word: "Colander", wordDe: "Nudelsieb", symbol: "colander" }
  ]},
  { id: "weather", theme: "Weather", themeDe: "Wetter", tier: 1, cards: [
      { word: "Cloud", wordDe: "Wolke", symbol: "cloud" },
      { word: "Lightning", wordDe: "Blitz", symbol: "lightning" },
      { word: "Rainbow", wordDe: "Regenbogen", symbol: "rainbow" },
      { word: "Tornado", wordDe: "Tornado", symbol: "tornado" },
      { word: "Raindrop", wordDe: "Regentropfen", symbol: "raindrop" },
      { word: "Snowflake", wordDe: "Schneeflocke", symbol: "snowflake" }
  ]},
  { id: "space", theme: "Space", themeDe: "Weltraum", tier: 1, cards: [
      { word: "Planet", wordDe: "Planet", symbol: "planet" },
      { word: "Moon", wordDe: "Mond", symbol: "moon" },
      { word: "Comet", wordDe: "Komet", symbol: "comet" },
      { word: "Satellite", wordDe: "Satellit", symbol: "satellite" },
      { word: "Astronaut", wordDe: "Astronaut", symbol: "astronaut" },
      { word: "Telescope", wordDe: "Teleskop", symbol: "telescope" }
  ]},
  { id: "furniture", theme: "Furniture", themeDe: "Möbel", tier: 1, cards: [
      { word: "Chair", wordDe: "Stuhl", symbol: "chair" },
      { word: "Table", wordDe: "Tisch", symbol: "table" },
      { word: "Sofa", wordDe: "Sofa", symbol: "sofa" },
      { word: "Bed", wordDe: "Bett", symbol: "bed" },
      { word: "Wardrobe", wordDe: "Schrank", symbol: "wardrobe" },
      { word: "Bookshelf", wordDe: "Bücherregal", symbol: "bookshelf" }
  ]},
  { id: "desserts", theme: "Desserts", themeDe: "Nachtisch", tier: 1, cards: [
      { word: "Ice Cream", wordDe: "Eistüte", symbol: "ice-cream" },
      { word: "Cupcake", wordDe: "Cupcake", symbol: "cupcake" },
      { word: "Donut", wordDe: "Donut", symbol: "donut" },
      { word: "Cake", wordDe: "Torte", symbol: "cake" },
      { word: "Pudding", wordDe: "Pudding", symbol: "pudding" },
      { word: "Popsicle", wordDe: "Stieleis", symbol: "popsicle" }
  ]},
  { id: "fast-food", theme: "Fast Food", themeDe: "Fast Food", tier: 1, cards: [
      { word: "Pizza", wordDe: "Pizza", symbol: "pizza" },
      { word: "Burger", wordDe: "Burger", symbol: "burger" },
      { word: "Fries", wordDe: "Pommes", symbol: "fries" },
      { word: "Hot Dog", wordDe: "Hotdog", symbol: "hot-dog" },
      { word: "Taco", wordDe: "Taco", symbol: "taco" },
      { word: "Sandwich", wordDe: "Sandwich", symbol: "sandwich" }
  ]},
  { id: "drinks", theme: "Drinks", themeDe: "Getränke", tier: 1, cards: [
      { word: "Coffee", wordDe: "Kaffee", symbol: "coffee" },
      { word: "Tea", wordDe: "Tee", symbol: "tea" },
      { word: "Milk", wordDe: "Milch", symbol: "milk" },
      { word: "Juice", wordDe: "Saft", symbol: "juice" },
      { word: "Lemonade", wordDe: "Limonade", symbol: "lemonade" },
      { word: "Smoothie", wordDe: "Smoothie", symbol: "smoothie" }
  ]},
  { id: "sports-equipment", theme: "Sports Equipment", themeDe: "Sportgeräte", tier: 1, cards: [
      { word: "Basketball", wordDe: "Basketball", symbol: "basketball" },
      { word: "Racket", wordDe: "Tennisschläger", symbol: "racket" },
      { word: "Dumbbell", wordDe: "Hantel", symbol: "dumbbell" },
      { word: "Hockey Stick", wordDe: "Hockeyschläger", symbol: "hockey-stick" },
      { word: "Boxing Glove", wordDe: "Boxhandschuh", symbol: "boxing-glove" },
      { word: "Bowling Pin", wordDe: "Bowlingkegel", symbol: "bowling-pin" }
  ]},
  { id: "bathroom", theme: "Bathroom", themeDe: "Badezimmer", tier: 1, cards: [
      { word: "Toothbrush", wordDe: "Zahnbürste", symbol: "toothbrush" },
      { word: "Toothpaste", wordDe: "Zahnpasta", symbol: "toothpaste" },
      { word: "Toilet", wordDe: "Toilette", symbol: "toilet" },
      { word: "Bathtub", wordDe: "Badewanne", symbol: "bathtub" },
      { word: "Soap", wordDe: "Seife", symbol: "soap" },
      { word: "Shower", wordDe: "Dusche", symbol: "shower" }
  ]},
  { id: "camping", theme: "Camping", themeDe: "Camping", tier: 1, cards: [
      { word: "Tent", wordDe: "Zelt", symbol: "tent" },
      { word: "Campfire", wordDe: "Lagerfeuer", symbol: "campfire" },
      { word: "Lantern", wordDe: "Laterne", symbol: "lantern" },
      { word: "Sleeping Bag", wordDe: "Schlafsack", symbol: "sleeping-bag" },
      { word: "Compass", wordDe: "Kompass", symbol: "compass" },
      { word: "Binoculars", wordDe: "Fernglas", symbol: "binoculars" }
  ]},
  { id: "office-supplies", theme: "Office Supplies", themeDe: "Bürobedarf", tier: 1, cards: [
      { word: "Stapler", wordDe: "Tacker", symbol: "stapler" },
      { word: "Paperclip", wordDe: "Büroklammer", symbol: "paperclip" },
      { word: "Pencil", wordDe: "Bleistift", symbol: "pencil" },
      { word: "Eraser", wordDe: "Radiergummi", symbol: "eraser" },
      { word: "Calculator", wordDe: "Taschenrechner", symbol: "calculator" },
      { word: "Pushpin", wordDe: "Reißzwecke", symbol: "pushpin" }
  ]},
  { id: "shapes", theme: "Shapes", themeDe: "Formen", tier: 1, cards: [
      { word: "Circle", wordDe: "Kreis", symbol: "circle" },
      { word: "Square", wordDe: "Quadrat", symbol: "square" },
      { word: "Triangle", wordDe: "Dreieck", symbol: "triangle" },
      { word: "Heart", wordDe: "Herz", symbol: "heart" },
      { word: "Pentagon", wordDe: "Fünfeck", symbol: "pentagon" },
      { word: "Hexagon", wordDe: "Sechseck", symbol: "hexagon" }
  ]}
];
