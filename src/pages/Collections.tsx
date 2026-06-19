import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Heart, Share2, Facebook, Twitter, Link as LinkIcon, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useLocation } from 'react-router-dom';

export const MOCK_PRODUCTS = [
  // Rings
  { id: 'RI001', name: '22K Classic Yellow Gold Gents Ring (RI001)', price: 155000, category: 'Rings', image: 'https://www.swarnamahal.lk/cdn/shop/files/RI0002126C.jpg?v=1692788516', description: '22KT Yellow Gold gents ring crafted with absolute precision. Gold Weight: 4.46g.', karatage: '22K', hasStones: false, dateAdded: '2023-10-01', views: 1250 },
  { id: 'RI002', name: '22K Stone Studded Gents & Ladies Engagement Ring (RI002)', price: 215000, category: 'Rings', image: 'https://www.swarnamahal.lk/cdn/shop/files/RI0002525C.jpg?v=1692788987', description: '22KT Yellow Gold gents/ladies ring with cubic zirconia stone accent. Gold Weight: 6.09g.', karatage: '22K', hasStones: true, dateAdded: '2023-11-15', views: 890 },
  { id: 'RI003', name: '18K Yellow Gold Gents & Ladies Ring (RI003)', price: 125000, category: 'Rings', image: 'https://www.swarnamahal.lk/cdn/shop/files/RI0002062C.jpg?v=1692788319', description: '18KT classic Yellow Gold ring designed for everyday elegant luxury. Gold Weight: 4.21g.', karatage: '18K', hasStones: false, dateAdded: '2024-01-10', views: 2100 },
  { id: 'RI004', name: '18K Yellow Gold Star Ring with Stone (RI004)', price: 132000, category: 'Rings', image: 'https://www.swarnamahal.lk/cdn/shop/products/RI0002319-C.jpg?v=1678276684', description: '18KT Yellow Gold ring embedded with brilliant accent stones. Gold Weight: 3.99g.', karatage: '18K', hasStones: true, dateAdded: '2023-09-05', views: 3400 },
  { id: 'RI005', name: '22K Yellow Gold Stone Star Band (RI005)', price: 78000, category: 'Rings', image: 'https://www.swarnamahal.lk/cdn/shop/products/RI0002066-A.jpg?v=1678276270', description: '22KT Yellow Gold minimalistic band adorned with premium white CZ. Gold Weight: 1.96g.', karatage: '22K', hasStones: true, dateAdded: '2024-02-20', views: 4500 },
  { id: 'RI006', name: '22K Stone Studded Ladies Ring (RI006)', price: 95000, category: 'Rings', image: 'https://www.swarnamahal.lk/cdn/shop/products/RI0002071A.jpg?v=1646733375', description: '22KT Yellow Gold stone-studded ring highlighting feminine charm. Gold Weight: 2.62g.', karatage: '22K', hasStones: true, dateAdded: '2023-12-01', views: 1100 },
  { id: 'RI007', name: '18K Gold Stone Studded Duo Ring (RI007)', price: 130000, category: 'Rings', image: 'https://www.swarnamahal.lk/cdn/shop/products/RI0002051A.jpg?v=1646733248', description: '18KT Yellow Gold gents/ladies ring set featuring brilliant zircon stones. Gold Weight: 4.10g.', karatage: '18K', hasStones: true, dateAdded: '2023-08-15', views: 2200 },
  { id: 'RI008', name: '22K Gold Stone Studded Duo Ring (RI008)', price: 210000, category: 'Rings', image: 'https://www.swarnamahal.lk/cdn/shop/products/RI0002038A.jpg?v=1646732288', description: '22KT Yellow Gold luxury duo design studded with top quality stones. Gold Weight: 6.05g.', karatage: '22K', hasStones: true, dateAdded: '2024-03-05', views: 1800 },
  { id: 'RI009', name: '22K Graceful Stone Studded Ladies Ring (RI009)', price: 82000, category: 'Rings', image: 'https://www.swarnamahal.lk/cdn/shop/products/RI0001963A.jpg?v=1646730822', description: '22KT Yellow Gold ladies ring glittering with delicate accent crystals. Gold Weight: 2.20g.', karatage: '22K', hasStones: true, dateAdded: '2023-07-20', views: 950 },
  { id: 'RI010', name: '22K Traditional Smooth Gold Ladies Ring (RI010)', price: 88000, category: 'Rings', image: 'https://www.swarnamahal.lk/cdn/shop/products/RI0001507B.jpg?v=1646730611', description: '22KT pure Yellow Gold ladies ring with custom hand-carved polished patterns. Gold Weight: 2.55g.', karatage: '22K', hasStones: false, dateAdded: '2023-10-25', views: 2800 },
  { id: 'RI011', name: '18K Elite Stone Studded Ladies Ring (RI011)', price: 145000, category: 'Rings', image: 'https://www.swarnamahal.lk/cdn/shop/products/RI0001305A.jpg?v=1646730289', description: '18KT handcrafted Yellow Gold ring highlighting beautiful central stone work. Gold Weight: 4.84g.', karatage: '18K', hasStones: true, dateAdded: '2024-01-30', views: 3100 },
  { id: 'RI012', name: '22K Prestige Stone Studded Ladies Ring (RI012)', price: 92000, category: 'Rings', image: 'https://www.swarnamahal.lk/cdn/shop/products/RI0001815A.jpg?v=1644822494', description: '22KT high-grade Yellow Gold ring decorated with a cluster of bright stones. Gold Weight: 2.59g.', karatage: '22K', hasStones: true, dateAdded: '2023-11-05', views: 1400 },
  { id: 'RI013', name: '22K Sweetheart Stone Studded Ladies Ring (RI013)', price: 80000, category: 'Rings', image: 'https://www.swarnamahal.lk/cdn/shop/products/RI0001649A.jpg?v=1646728786', description: '22KT lightweight Yellow Gold floral design ring with central stones. Gold Weight: 2.22g.', karatage: '22K', hasStones: true, dateAdded: '2023-09-12', views: 1600 },
  { id: 'RI014', name: '22K Imperial Stone Studded Ladies Ring (RI014)', price: 96000, category: 'Rings', image: 'https://www.swarnamahal.lk/cdn/shop/products/RI0002034A.jpg?v=1644819788', description: '22KT Yellow Gold ring crafted with custom motifs and zircon crystals. Gold Weight: 2.69g.', karatage: '22K', hasStones: true, dateAdded: '2024-02-14', views: 2500 },
  { id: 'RI015', name: '22K Blossom Stone Studded Ladies Ring (RI015)', price: 98000, category: 'Rings', image: 'https://www.swarnamahal.lk/cdn/shop/products/RI0002032A.jpg?v=1644819654', description: '22KT elaborate Yellow Gold cocktail ring with shimmering pave setting. Gold Weight: 2.76g.', karatage: '22K', hasStones: true, dateAdded: '2024-01-05', views: 3800 },
  { id: 'RI016', name: '18K Diamond Style Stone Studded Ladies Ring (RI016)', price: 42000, category: 'Rings', image: 'https://www.swarnamahal.lk/cdn/shop/products/RI0001776A.jpg?v=16401551955', description: '18KT Yellow Gold delicate design ring with miniature star accent stones. Gold Weight: 1.00g.', karatage: '18K', hasStones: true, dateAdded: '2024-02-10', views: 4000 },

  // Necklaces
  { id: 'NE001', name: '22K Swarovski Zirconia Premium Necklace (NE001)', price: 520000, category: 'Necklaces', image: 'https://www.swarnamahal.lk/cdn/shop/products/NE0001014B.jpg?v=1593000311', description: '22KT Yellow Gold hand-crafted necklace studded with best quality Swarovski zirconia. Gold Weight: 15.00g.', karatage: '22K', hasStones: true, dateAdded: '2023-11-20', views: 6500 },
  { id: 'NE002', name: '18K Hand-Crafted Swarovski Zirconia Necklace (NE002)', price: 495000, category: 'Necklaces', image: 'https://www.swarnamahal.lk/cdn/shop/products/NE0000997A.jpg?v=1593000106', description: '18KT beautiful hand-crafted necklace detailed with cubic zirconia crystals. Gold Weight: 17.49g.', karatage: '18K', hasStones: true, dateAdded: '2024-01-15', views: 5800 },
  { id: 'NE003', name: '22K Majestic Gold Stone Necklace (NE003)', price: 440000, category: 'Necklaces', image: 'https://www.swarnamahal.lk/cdn/shop/products/NE0001199a.jpg?v=1608110061', description: '22KT luxurious hand-crafted necklace detailed with custom gemstone settings. Gold Weight: 12.50g.', karatage: '22K', hasStones: true, dateAdded: '2023-11-10', views: 2400 },
  { id: 'NE004', name: '18K Delicate Hand-Crafted Stone Necklace (NE004)', price: 295000, category: 'Necklaces', image: 'https://www.swarnamahal.lk/cdn/shop/products/NE0001143a.jpg?v=1608110204', description: '18KT Yellow Gold intricate designer necklace with brilliant fine stones. Gold Weight: 9.81g.', karatage: '18K', hasStones: true, dateAdded: '2023-12-05', views: 1850 },
  { id: 'NE005', name: '22K Elegant Hand-Crafted Stone Necklace (NE005)', price: 310000, category: 'Necklaces', image: 'https://www.swarnamahal.lk/cdn/shop/products/NE0001091a.jpg?v=1610515713', description: '22KT ornate, drop pattern gold necklace with dangling stone beads. Gold Weight: 8.99g.', karatage: '22K', hasStones: true, dateAdded: '2024-01-18', views: 1950 },
  { id: 'NE006', name: '22K Hand-Crafted Filigree Stone Necklace (NE006)', price: 430000, category: 'Necklaces', image: 'https://www.swarnamahal.lk/cdn/shop/products/NE0001096a.jpg?v=1608110135', description: '22KT traditional filigree art yellow gold necklace with stones. Gold Weight: 12.41g.', karatage: '22K', hasStones: true, dateAdded: '2023-10-05', views: 1300 },
  { id: 'NE007', name: '22K Swarovski Zirconia Choker Necklace (NE007)', price: 540000, category: 'Necklaces', image: 'https://www.swarnamahal.lk/cdn/shop/products/NE0000974A.jpg?v=1593000004', description: '22KT stunning high-collar choker necklace decorated with brilliant zirconia. Gold Weight: 15.73g.', karatage: '22K', hasStones: true, dateAdded: '2023-08-30', views: 3400 },
  { id: 'NE008', name: '22K Royal Amethyst & Zirconia Necklace (NE008)', price: 720000, category: 'Necklaces', image: 'https://www.swarnamahal.lk/cdn/shop/products/NE0000970A.jpg?v=1592999919', description: '22KT prestigious yellow gold necklace set with genuine purple amethyst and zirconia stones. Gold Weight: 21.65g.', karatage: '22K', hasStones: true, dateAdded: '2023-09-15', views: 4200 },
  { id: 'NE009', name: '22K Symphony Swarovski Stone Necklace (NE009)', price: 660000, category: 'Necklaces', image: 'https://www.swarnamahal.lk/cdn/shop/products/NE0000779A.jpg?v=1592999744', description: '22KT mastercraft yellow gold broad necklace with highly reflective Swarovski crystals. Gold Weight: 19.54g.', karatage: '22K', hasStones: true, dateAdded: '2024-02-12', views: 3700 },
  { id: 'NE010', name: '22K Heritage Swarovski Bloom Necklace (NE010)', price: 665000, category: 'Necklaces', image: 'https://www.swarnamahal.lk/cdn/shop/products/NE0001041A.jpg?v=1593000466', description: '22KT luxurious floral themed necklace in high polish yellow gold. Gold Weight: 19.58g.', karatage: '22K', hasStones: true, dateAdded: '2023-07-25', views: 2900 },
  { id: 'NE011', name: '22K Classic Starlet Gold Necklace (NE011)', price: 360000, category: 'Necklaces', image: 'https://www.swarnamahal.lk/cdn/shop/products/NE0001160a.jpg?v=1610534957', description: '22KT premium yellow gold simple chain style necklace with stone drops. Gold Weight: 10.21g.', karatage: '22K', hasStones: true, dateAdded: '2023-11-28', views: 1550 },
  { id: 'NE012', name: '22K Imperial Swarovski Marquise Necklace (NE012)', price: 680000, category: 'Necklaces', image: 'https://www.swarnamahal.lk/cdn/shop/products/NE0000523-B.jpg?v=1591085069', description: '22KT statement necklace embellished with magnificent marquise-cut stones. Gold Weight: 20.12g.', karatage: '22K', hasStones: true, dateAdded: '2023-06-15', views: 3100 },
  { id: 'NE013', name: '18K Grandeur Swarovski Bridal Necklace (NE013)', price: 410000, category: 'Necklaces', image: 'https://www.swarnamahal.lk/cdn/shop/products/NE0000307-A.jpg?v=1584008360', description: '18KT white and yellow multi-tone crafted gold necklace with elite zirconia crystals. Gold Weight: 14.32g.', karatage: '18K', hasStones: true, dateAdded: '2023-05-10', views: 1900 },
  { id: 'NE014', name: '18K Seamless Traditional Gold Necklace (NE014)', price: 450000, category: 'Necklaces', image: 'https://www.swarnamahal.lk/cdn/shop/products/NE0001015A.jpg?v=1593000386', description: '18KT pure solid Yellow Gold traditional handcrafted necklace with high mirror polish. Gold Weight: 16.00g.', karatage: '18K', hasStones: false, dateAdded: '2024-03-01', views: 2700 },

  // Earrings
  { id: 'ES001', name: '22K Swarovski Starlet Ear Studs (ES001)', price: 72000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/files/ES0000869B.jpg?v=1692020976', description: '22KT Yellow Gold elegant ear studs with starburst pattern cubic zirconia. Gold Weight: 2.01g.', karatage: '22K', hasStones: true, dateAdded: '2023-10-18', views: 1100 },
  { id: 'ES002', name: '22K Delicate Solitaire Ear Studs (ES002)', price: 39000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/files/ES0001464B.jpg?v=1692020890', description: '22KT Yellow Gold dainty ear studs featuring a central shimmering stone. Gold Weight: 1.06g.', karatage: '22K', hasStones: true, dateAdded: '2023-12-14', views: 1420 },
  { id: 'ES003', name: '18K Prestige Solitaire Crystal Studs (ES003)', price: 68000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/files/ES0001477B.jpg?v=1692020855', description: '18KT Yellow Gold studs decorated with exquisite micro-pave crystals. Gold Weight: 2.13g.', karatage: '18K', hasStones: true, dateAdded: '2024-01-20', views: 900 },
  { id: 'ES004', name: '18K Pure Minimalist Hoop Ear Studs (ES004)', price: 29000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/files/ES0001490B.jpg?v=1692020798', description: '18KT beautiful high polish round plain gold ear studs. Gold Weight: 0.86g.', karatage: '18K', hasStones: false, dateAdded: '2023-08-05', views: 800 },
  { id: 'ES005', name: '22K Tiny Blossom Ear Studs with CZ (ES005)', price: 25000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/files/ES0000001B.jpg?v=1692019581', description: '22KT Gold miniature flower-shaped studs embedded with cubic zirconia. Gold Weight: 0.65g.', karatage: '22K', hasStones: true, dateAdded: '2023-11-30', views: 1530 },
  { id: 'ES006', name: '22K Dainty Stone Petal Studs (ES006)', price: 26000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/products/ES0001484-B.jpg?v=1678274801', description: '22KT delicate Gold petals studs adorned with micro round stones. Gold Weight: 0.67g.', karatage: '22K', hasStones: true, dateAdded: '2023-09-11', views: 780 },
  { id: 'ES007', name: '22K Glamour Halo Ear Studs (ES007)', price: 73000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/products/ES0001473-A.jpg?v=1678274028', description: '22KT beautiful Gold studs surrounded by a halo of glittering crystals. Gold Weight: 2.02g.', karatage: '22K', hasStones: true, dateAdded: '2024-02-17', views: 1200 },
  { id: 'ES008', name: '18K Classic Solitaire Accent Studs (ES008)', price: 26000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/products/ES0001457-B.jpg?v=1678273272', description: '18KT modern lightweight studs with fine central stone mounting. Gold Weight: 0.74g.', karatage: '18K', hasStones: true, dateAdded: '2023-07-15', views: 640 },
  { id: 'ES009', name: '22K Cubic Zirconia Drop Earrings (ES009)', price: 71000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/products/ES0000155-B.jpg?v=1678266378', description: '22KT high shine Gold earrings decorated with hanging cubic zirconia. Gold Weight: 1.96g.', karatage: '22K', hasStones: true, dateAdded: '2023-10-10', views: 1450 },
  { id: 'ES010', name: '22K Elegant Star Crown Studs (ES010)', price: 74000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/products/ES0000417-B.jpg?v=1678271760', description: '22KT premium Yellow Gold studs featuring a crown motif with stones. Gold Weight: 2.06g.', karatage: '22K', hasStones: true, dateAdded: '2024-03-05', views: 1670 },
  { id: 'ES011', name: '22K Stone Studded Gypsy Hoops (ES011)', price: 92000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/products/GY0000008B.jpg?v=1629694890', description: '22KT traditional Gypsy style circular hoops decorated with precious zircon. Gold Weight: 2.57g.', karatage: '22K', hasStones: true, dateAdded: '2023-11-25', views: 2900 },
  { id: 'ES012', name: '22K Cubic Zirconia cluster Studs (ES012)', price: 71000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/products/ES0000017-B.jpg?v=1678266297', description: '22KT fine Gold studs boasting twelve perfectly arranged zirconia stones. Gold Weight: 1.95g.', karatage: '22K', hasStones: true, dateAdded: '2024-01-12', views: 1100 },
  { id: 'ES013', name: '22K Dewdrop Stone Studded Studs (ES013)', price: 44000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/products/ES0001301A.jpg?v=1628679223', description: '22KT elegant tear drop design studs with clear stone inlay. Gold Weight: 1.15g.', karatage: '22K', hasStones: true, dateAdded: '2023-09-08', views: 1300 },
  { id: 'ES014', name: '18K Twelve-Zirconia Halo Studs (ES014)', price: 42000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/products/ES0001216c.jpg?v=1625665625', description: '18KT gorgeous daily wear studs embedded with 12 brilliant CZ stones. Gold Weight: 1.22g.', karatage: '18K', hasStones: true, dateAdded: '2023-10-02', views: 820 },
  { id: 'ES015', name: '18K Fourteen-Zirconia Flare Studs (ES015)', price: 36000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/products/ES0000960c.jpg?v=1625665342', description: '18KT modern flares pattern gold studs featuring 14 shimmering stones. Gold Weight: 1.02g.', karatage: '18K', hasStones: true, dateAdded: '2023-12-22', views: 950 },
  { id: 'ES016', name: '22K Elegant Cluster Pave Hoops (ES016)', price: 77000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/products/ES0000298c.jpg?v=1625665033', description: '22KT luxurious loop earrings featuring 14 hand-set white crystals. Gold Weight: 2.14g.', karatage: '22K', hasStones: true, dateAdded: '2024-02-14', views: 1800 },
  { id: 'ES017', name: '22K Crescent Harmony Studs (ES017)', price: 68000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/products/ES0000057A.jpg?v=1618809285', description: '22KT traditional design studs with customized scrollwork and stones. Gold Weight: 1.87g.', karatage: '22K', hasStones: true, dateAdded: '2023-06-20', views: 1210 },
  { id: 'ES018', name: '22K Minimalist Starlet Studs (ES018)', price: 37000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/products/ES0001168A.jpg?v=1618809863', description: '22KT small star-shaped delicate studs decorated with tiny crystals. Gold Weight: 0.98g.', karatage: '22K', hasStones: true, dateAdded: '2023-07-16', views: 1350 },
  { id: 'ES019', name: '22K Geometric Square Studs (ES019)', price: 35000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/products/ES0001193A.jpg?v=1613385249', description: '22KT modern rectangular minimalist ear studs with accent stones. Gold Weight: 0.92g.', karatage: '22K', hasStones: true, dateAdded: '2023-08-11', views: 1100 },
  { id: 'ES020', name: '18K Harmony Blossom Flare Studs (ES020)', price: 41000, category: 'Earrings', image: 'https://www.swarnamahal.lk/cdn/shop/products/ES0001201C.jpg?v=1611580737', description: '18KT stylized floral pattern studs detailed with fourteen bright round stones. Gold Weight: 1.20g.', karatage: '18K', hasStones: true, dateAdded: '2024-01-08', views: 1250 },

  // Bracelets
  { id: 'BR001', name: '22K Cubic Zirconia Tennis Bracelet (BR001)', price: 275000, category: 'Bracelets', image: 'https://www.swarnamahal.lk/cdn/shop/products/BR0000111B.jpg?v=1647333511', description: '22KT breathtaking ladies bracelet studded with 45 flawless individual cubic zirconia. Gold Weight: 7.55g.', karatage: '22K', hasStones: true, dateAdded: '2023-11-05', views: 2400 },
  { id: 'BR002', name: '22K Crystal Cascade Bracelet (BR002)', price: 205000, category: 'Bracelets', image: 'https://www.swarnamahal.lk/cdn/shop/products/BR0000133B.jpg?v=1615533929', description: '22KT sparkling ladies bracelet structured with 51 premium round cut stones. Gold Weight: 5.55g.', karatage: '22K', hasStones: true, dateAdded: '2023-10-15', views: 1850 },
  { id: 'BR003', name: '18K Elite Fifty-Stone Tennis Bracelet (BR003)', price: 220000, category: 'Bracelets', image: 'https://www.swarnamahal.lk/cdn/shop/products/BR0000097B.jpg?v=1615533920', description: '18KT sleek white-gold tennis bracelet set with 50 brilliant master cut crystals. Gold Weight: 7.03g.', karatage: '18K', hasStones: true, dateAdded: '2024-02-18', views: 2100 },
  { id: 'BR004', name: '18K Star Stream Crystal Bracelet (BR004)', price: 285000, category: 'Bracelets', image: 'https://www.swarnamahal.lk/cdn/shop/products/BR0000157B.jpg?v=1615533938', description: '18KT yellow gold line bracelet showcasing 36 hand-set micro stones. Gold Weight: 9.11g.', karatage: '18K', hasStones: true, dateAdded: '2023-08-30', views: 1250 },
  { id: 'BR005', name: '18K Pave Splendor Dual-Row Bracelet (BR005)', price: 290000, category: 'Bracelets', image: 'https://www.swarnamahal.lk/cdn/shop/products/BR0000096B.jpg?v=1615533915', description: '18KT gorgeous double-row bracelet with 72 beautifully integrated stones. Gold Weight: 9.32g.', karatage: '18K', hasStones: true, dateAdded: '2024-01-05', views: 3100 },
  { id: 'BR006', name: '22K Celestial Crown Stone Bracelet (BR006)', price: 205000, category: 'Bracelets', image: 'https://www.swarnamahal.lk/cdn/shop/products/BR0000089B.jpg?v=1647332835', description: '22KT unique wave design bracelet embedded with 11 exquisite focal stones. Gold Weight: 5.56g.', karatage: '22K', hasStones: true, dateAdded: '2023-12-10', views: 1400 },
  { id: 'BR007', name: '22K Traditional Thick Gold Bangle (BR007)', price: 295000, category: 'Bracelets', image: 'https://www.swarnamahal.lk/cdn/shop/products/BR0000032B.jpg?v=1615533910', description: '22KT highly ornate traditional heavy Solid Gold bangle/bracelet. Gold Weight: 8.37g.', karatage: '22K', hasStones: false, dateAdded: '2023-09-25', views: 3200 },
  { id: 'BR008', name: '22K Deca-Stone Crown Cluster Bracelet (BR008)', price: 285000, category: 'Bracelets', image: 'https://www.swarnamahal.lk/cdn/shop/products/BR0000136B.jpg?v=1615533933', description: '22KT charming yellow gold link bracelet holding ten bright diamond cut stones. Gold Weight: 8.10g.', karatage: '22K', hasStones: true, dateAdded: '2023-07-22', views: 1750 },
  { id: 'BR009', name: '18K White Gold Genuine Diamond Bracelet (BR009)', price: 850000, category: 'Bracelets', image: 'https://www.swarnamahal.lk/cdn/shop/products/07DR19-18K195C.jpg?v=1593069723', description: '18KT elite White Gold luxury designer bracelet set with genuine glittering diamonds. Gold Weight: 14.38g.', karatage: '18K', hasStones: true, dateAdded: '2024-03-10', views: 4500 },
  { id: 'BR010', name: '18K Luxury Diamond Imperial Bangle (BR010)', price: 1250000, category: 'Bracelets', image: 'https://www.swarnamahal.lk/cdn/shop/products/07DR19-18K188C.jpg?v=1593069541', description: '18KT ultra premium handcrafted White Gold bangle encrusted with real royal diamonds. Gold Weight: 22.93g.', karatage: '18K', hasStones: true, dateAdded: '2024-01-25', views: 5800 },
  { id: 'BR011', name: '18K Royal Platinum-Tone Smooth Link (BR011)', price: 680000, category: 'Bracelets', image: 'https://www.swarnamahal.lk/cdn/shop/products/07DR19-18K194B.jpg?v=1593069634', description: '18KT modern, heavy links design bracelet in multi-tone brilliant white gold. Gold Weight: 22.61g.', karatage: '18K', hasStones: false, dateAdded: '2023-11-15', views: 2400 },
  { id: 'BR012', name: '22K Gold & Diamond Infused Elite Bangle (BR012)', price: 480000, category: 'Bracelets', image: 'https://www.swarnamahal.lk/cdn/shop/products/07DR19-18K410C.jpg?v=1593069812', description: '22KT White & Yellow duo gold luxury ladies bracelet featuring authentic diamond trims. Gold Weight: 6.98g.', karatage: '22K', hasStones: true, dateAdded: '2024-02-11', views: 3300 },

  // Pendants
  { id: 'PE001', name: '22K Traditional Panchayuda Shield Pendant (PE001)', price: 45000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PA0000054a.jpg?v=1610535191', description: '22KT traditional Panchayuda talisman/pendant for protection and style. Gold Weight: 1.20g.', karatage: '22K', hasStones: false, dateAdded: '2023-11-20', views: 1800 },
  { id: 'PE002', name: '22K Classic Heart Minimalist Pendant (PE002)', price: 24000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PE0000753C.jpg?v=1605499668', description: '22KT high polish dainty golden heart shape charm/pendant. Gold Weight: 0.60g.', karatage: '22K', hasStones: false, dateAdded: '2023-08-15', views: 980 },
  { id: 'PE003', name: '22K Swarovski Sparkle Star Pendant (PE003)', price: 58000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PE0002057A.jpg?v=1678277706', description: '22KT Yellow Gold delicate star drop pendant encrusted with clear CZ stones. Gold Weight: 1.54g.', karatage: '22K', hasStones: true, dateAdded: '2024-01-10', views: 1450 },
  { id: 'PE004', name: '18K Abstract Geo Modernist Pendant (PE004)', price: 95000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PE0002131A.jpg?v=1678277829', description: '18KT contemporary bold geometric design smooth gold pendant. Gold Weight: 3.15g.', karatage: '18K', hasStones: false, dateAdded: '2023-12-05', views: 1100 },
  { id: 'PE005', name: '22K Elite Solitaire Drop Pendant (PE005)', price: 78000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PE0002057A.jpg?v=1678277706', description: '22KT Yellow Gold heavy drop pendant highlighting a bright faceted stone. Gold Weight: 2.16g.', karatage: '22K', hasStones: true, dateAdded: '2023-10-18', views: 1250 },
  { id: 'PE006', name: '22K Crown Bloom Cluster Pendant (PE006)', price: 74000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PE0000889A.jpg?v=1678277662', description: '22KT flower shape pendant adorned with brilliant pave stones in a bundle. Gold Weight: 2.03g.', karatage: '22K', hasStones: true, dateAdded: '2024-02-14', views: 1350 },
  { id: 'PE007', name: '22K Crescent Orchid Pave Pendant (PE007)', price: 80000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PE0000537A.jpg?v=1678277456', description: '22KT beautiful half-moon floral style pendant detailed with cubic zirconia. Gold Weight: 2.20g.', karatage: '22K', hasStones: true, dateAdded: '2023-12-25', views: 1900 },
  { id: 'PE008', name: '18K Duo-Ring Interlocking Pendant (PE008)', price: 74000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PE0000488A.jpg?v=1678277417', description: '18KT elegant interlocking rings design pendant embedded with crystals. Gold Weight: 2.37g.', karatage: '18K', hasStones: true, dateAdded: '2024-03-02', views: 1150 },
  { id: 'PE009', name: '18K Solitaire Cross-Cut Mini Pendant (PE009)', price: 43000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PE0000401A.jpg?v=1678277339', description: '18KT beautiful square cut single crystal pendant with solid gold mount. Gold Weight: 1.34g.', karatage: '18K', hasStones: true, dateAdded: '2023-09-15', views: 820 },
  { id: 'PE010', name: '22K Anchor of Hope Nautical Pendant (PE010)', price: 135000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PE0000215A_f6ddc194-5b84-4e3e-8d14-99aecfe7e755.jpg?v=1678268086', description: '22KT thick solid Yellow Gold detailed anchor emblem pendant. Gold Weight: 3.86g.', karatage: '22K', hasStones: false, dateAdded: '2023-11-12', views: 2100 },
  { id: 'PE011', name: '22K Sacred Crucifix Smooth Cross (PE011)', price: 36000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/files/CR0000034A.jpg?v=1691769523', description: '22KT holy cross design pendant, meticulously handcrafted and polished. Gold Weight: 0.97g.', karatage: '22K', hasStones: false, dateAdded: '2023-07-10', views: 2400 },
  { id: 'PE012', name: '22K Petal Crest Crystal Pendant (PE012)', price: 48000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PE0001556A.jpg?v=1605500272', description: '22KT royal pattern crest pendant finished with tiny zircon details. Gold Weight: 1.30g.', karatage: '22K', hasStones: true, dateAdded: '2023-08-30', views: 670 },
  { id: 'PE013', name: '22K heavy Royal Filigree Pendant (PE013)', price: 165000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PE0001541A.jpg?v=1607075250', description: '22KT spectacular filigree work large medallion pendant. Gold Weight: 4.73g.', karatage: '22K', hasStones: false, dateAdded: '2023-11-02', views: 1540 },
  { id: 'PE014', name: '22K Vintage Mirror Polish Charm (PE014)', price: 82000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PE0001677A.jpg?v=1607076420', description: '22KT yellow gold smooth drop design pendant with fine beaded outlines. Gold Weight: 2.30g.', karatage: '22K', hasStones: false, dateAdded: '2024-01-05', views: 1100 },
  { id: 'PE015', name: '22K Majestic Drop Smooth Contour Variant (PE015)', price: 88000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PE0001681A.jpg?v=1607077237', description: '22KT contemporary smooth contour variant gold pendant. Gold Weight: 2.49g.', karatage: '22K', hasStones: false, dateAdded: '2024-02-10', views: 1150 },
  { id: 'PE016', name: '22K Teardrop Harmony Plain Pendant (PE016)', price: 52000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PE0001679A.jpg?v=1607077075', description: '22KT solid elegant plain droplet gold pendant. Gold Weight: 1.44g.', karatage: '22K', hasStones: false, dateAdded: '2023-06-25', views: 880 },
  { id: 'PE017', name: '18K Mod Geometric Solid Gold Pendant (PE017)', price: 58000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PE0001690A.jpg?v=1607078647', description: '18KT daily wear sleek structured golden polygon pendant. Gold Weight: 1.86g.', karatage: '18K', hasStones: false, dateAdded: '2023-05-18', views: 720 },
  { id: 'PE018', name: '22K Harmony Loop Traditional Pendant (PE018)', price: 76000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PE0001678A.jpg?v=1607076495', description: '22KT beautiful scroll contour pendant without stones. Gold Weight: 2.12g.', karatage: '22K', hasStones: false, dateAdded: '2023-09-30', views: 1040 },
  { id: 'PE019', name: '22K Royal Marquis Brilliant Stone Pendant (PE019)', price: 148000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PE0001515a.jpg?v=1610532931', description: '22KT elite large marquise cut stone centered in solid gold bezel setting. Gold Weight: 4.08g.', karatage: '22K', hasStones: true, dateAdded: '2024-02-28', views: 2200 },
  { id: 'PE020', name: '22K Grand Crown Pave Pendant (PE020)', price: 75000, category: 'Pendants', image: 'https://www.swarnamahal.lk/cdn/shop/products/PE0001583A.jpg?v=1611588315', description: '22KT gold crown pattern pendant loaded with premium micro pave crystals. Gold Weight: 2.09g.', karatage: '22K', hasStones: true, dateAdded: '2024-01-15', views: 1400 }
];

const CATEGORIES = ['All', 'Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Pendants'];

export default function Collections() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const categoryParam = searchParams.get('category');
  const priceParam = searchParams.get('price');
  const karatageParam = searchParams.get('karatage');
  const stonesParam = searchParams.get('stones');
  
  const [activeCategory, setActiveCategory] = useState('All');
  const [urlFilters, setUrlFilters] = useState<{price?: string}>({});
  const [isLoading, setIsLoading] = useState(false);

  // New states for extended filtering and sorting
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const [karatageFilter, setKaratageFilter] = useState<string[]>([]);
  const [stonesFilter, setStonesFilter] = useState<string | null>(null);

  const maxProductPrice = Math.max(...MOCK_PRODUCTS.map(p => p.price));
  const [maxPrice, setMaxPrice] = useState(maxProductPrice);

  useEffect(() => {
    if (categoryParam) {
      const match = CATEGORIES.find(c => c.toLowerCase() === categoryParam.toLowerCase());
      if (match) setActiveCategory(match);
    }
    
    if (priceParam) {
      setUrlFilters({ price: priceParam });
    } else {
      setUrlFilters({});
    }

    if (karatageParam && karatageParam !== 'Any') {
      setKaratageFilter([karatageParam]);
    }

    if (stonesParam && stonesParam !== 'Any') {
      setStonesFilter(stonesParam === 'With Stones' ? 'with' : 'without');
    }

    if (categoryParam || priceParam || karatageParam || stonesParam) {
      // Clean up from URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [categoryParam, priceParam, karatageParam, stonesParam]);

  useEffect(() => {
    // Simulate loading for better UX when filters change
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, [activeCategory, urlFilters, maxPrice, sortBy, karatageFilter, stonesFilter]);

  const { addToCart } = useCart();
  const { toggleWishlistItem, isInWishlist } = useWishlist();

  const filteredProducts = useMemo(() => {
    let products = activeCategory === 'All' 
      ? [...MOCK_PRODUCTS] 
      : MOCK_PRODUCTS.filter(p => p.category === activeCategory);

    if (urlFilters.price) {
      if (urlFilters.price === 'Under LKR 150K') products = products.filter(p => p.price < 150000);
      else if (urlFilters.price === 'LKR 150K - 600K') products = products.filter(p => p.price >= 150000 && p.price <= 600000);
      else if (urlFilters.price === 'Over LKR 600K') products = products.filter(p => p.price > 600000);
    }
    
    if (maxPrice < maxProductPrice) {
      products = products.filter(p => p.price <= maxPrice);
    }

    if (karatageFilter.length > 0) {
      products = products.filter(p => p.karatage && karatageFilter.includes(p.karatage));
    }
    
    if (stonesFilter) {
      if (stonesFilter === 'with') {
        products = products.filter(p => p.hasStones === true);
      } else if (stonesFilter === 'without') {
        products = products.filter(p => p.hasStones === false);
      }
    }

    if (sortBy === 'latest') {
      products.sort((a, b) => new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime());
    } else if (sortBy === 'most_viewed') {
      products.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sortBy === 'price_low_high') {
      products.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_high_low') {
      products.sort((a, b) => b.price - a.price);
    }

    return products;
  }, [activeCategory, urlFilters, maxPrice, maxProductPrice, karatageFilter, stonesFilter, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-serif mb-6 text-gold-gradient">The Masterpieces</h1>
        <div className="w-24 h-0.5 bg-gold-gradient mx-auto mb-6"></div>
        <p className="max-w-2xl mx-auto text-sm text-[var(--color-ink)] opacity-80">
          Discover our full range of exquisite pieces, each crafted with unparalleled attention to detail and beauty.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-12 border-b border-black/5 pb-8 overflow-x-auto whitespace-nowrap">
        {CATEGORIES.map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`uppercase tracking-[0.15em] text-xs pb-2 font-semibold transition-all ${
              activeCategory === category ? 'text-[var(--color-gold)] border-b-2 border-[var(--color-gold)]' : 'text-gray-500 hover:text-[var(--color-gold-light)]'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Advanced Filters Bar */}
      <div className="flex justify-end gap-4 items-center mb-8 pb-4">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 border border-black px-6 py-3 uppercase tracking-widest text-xs font-bold hover:bg-black hover:text-white transition-colors"
        >
          {showFilters ? 'Hide Filters' : 'Filter By'} 
          {showFilters ? <X size={16} /> : <span className="text-lg leading-none font-normal">+</span>}
        </button>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none border border-black px-6 py-3 pr-10 uppercase tracking-widest text-xs font-bold bg-white focus:outline-none cursor-pointer"
          >
            <option value="latest">Sort By Latest</option>
            <option value="most_viewed">Most Viewed</option>
            <option value="price_low_high">Price: Low to High</option>
            <option value="price_high_low">Price: High to Low</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-black">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-[#fcf8f0] border border-[#e5dfd3] p-8 mb-12 flex flex-col md:flex-row gap-12 rounded-sm transition-all duration-300">
          
          <div className="flex-1">
            <h4 className="font-serif text-2xl text-[var(--color-ink)] mb-8">Filter by</h4>
            
            <div className="mb-8">
              <h5 className="text-[12px] uppercase font-bold tracking-widest text-gray-800 mb-5">Karatage</h5>
              <div className="flex gap-10">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 flex items-center justify-center border transition-colors ${karatageFilter.includes('18K') ? 'bg-[#e5dfd3] border-[#e5dfd3]' : 'bg-white border-gray-300 group-hover:border-gray-400'}`}>
                    {karatageFilter.includes('18K') && <svg className="w-4 h-4 text-[#8a7f66]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>}
                  </div>
                  <input type="checkbox" className="hidden" checked={karatageFilter.includes('18K')} onChange={() => {
                    setKaratageFilter(prev => prev.includes('18K') ? prev.filter(k => k !== '18K') : [...prev, '18K'])
                  }} />
                  <span className="text-[15px] text-[#4a5568]">18K</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 flex items-center justify-center border transition-colors ${karatageFilter.includes('22K') ? 'bg-[#e5dfd3] border-[#e5dfd3]' : 'bg-white border-gray-300 group-hover:border-gray-400'}`}>
                    {karatageFilter.includes('22K') && <svg className="w-4 h-4 text-[#8a7f66]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>}
                  </div>
                  <input type="checkbox" className="hidden" checked={karatageFilter.includes('22K')} onChange={() => {
                    setKaratageFilter(prev => prev.includes('22K') ? prev.filter(k => k !== '22K') : [...prev, '22K'])
                  }} />
                  <span className="text-[15px] text-[#4a5568]">22K</span>
                </label>
              </div>
            </div>

            <div className="mb-4">
              <h5 className="text-[12px] uppercase font-bold tracking-widest text-gray-800 mb-5 relative flex items-center gap-3">
                Stones 
                {stonesFilter && <button onClick={() => setStonesFilter(null)} className="text-[9px] text-[#a09a8a] underline hover:text-black uppercase tracing-widest">Clear</button>}
              </h5>
              <div className="flex gap-10">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-full border transition-colors relative flex items-center justify-center ${stonesFilter === 'with' ? 'border-[#8a7f66]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                     {stonesFilter === 'with' && <div className="w-2.5 h-2.5 rounded-full bg-[#8a7f66]"></div>}
                  </div>
                  <input type="radio" name="stones" className="hidden" checked={stonesFilter === 'with'} onChange={() => setStonesFilter('with')} />
                  <span className="text-[15px] text-[#4a5568]">With Stones</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-full border transition-colors relative flex items-center justify-center ${stonesFilter === 'without' ? 'border-[#8a7f66]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                    {stonesFilter === 'without' && <div className="w-2.5 h-2.5 rounded-full bg-[#8a7f66]"></div>}
                  </div>
                  <input type="radio" name="stones" className="hidden" checked={stonesFilter === 'without'} onChange={() => setStonesFilter('without')} />
                  <span className="text-[15px] text-[#4a5568]">Without Stones</span>
                </label>
              </div>
            </div>

          </div>
          
          <div className="w-px bg-[#e5dfd3] hidden md:block"></div>

          <div className="flex-1 md:max-w-md flex flex-col justify-start">
            <h4 className="font-serif text-2xl text-[var(--color-ink)] mb-8 opacity-0 pointer-events-none hidden md:block">Budget</h4>
            <label className="text-[12px] uppercase font-bold tracking-widest text-gray-800 mb-6">
              Maximum Budget: <span className="text-[var(--color-gold)]">LKR {maxPrice.toLocaleString()}</span>
            </label>
            <div className="w-full relative mt-2">
              <input 
                type="range" 
                min="0" 
                max={maxProductPrice} 
                step="10000" 
                value={maxPrice} 
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full h-[3px] bg-[#e5dfd3] rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
              />
              <div className="flex justify-between mt-3 text-[11px] text-[#a09a8a] uppercase font-bold tracking-wider">
                <span>Any</span>
                <span>LKR {maxProductPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
        </div>
      )}

      {/* Active Selection Filters from Style Assistant */}
      {(urlFilters.price) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10 -mt-8">
          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Match Filters:</span>
          {urlFilters.price && (
            <span className="flex items-center gap-2 bg-[#D4AF37]/5 border border-[#D4AF37]/20 text-[#D4AF37] px-3 py-1.5 rounded-full text-xs font-medium">
              {urlFilters.price}
              <button 
                onClick={() => setUrlFilters(prev => ({...prev, price: undefined}))}
                className="hover:text-black transition-colors"
                title="Remove filter"
              >
                <X size={12} />
              </button>
            </span>
          )}
          <button 
             onClick={() => setUrlFilters({})} 
             className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-black underline transition-colors"
          >
             Clear All
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="animate-pulse">
              <div className="relative aspect-[4/5] bg-gray-200 rounded-lg overflow-hidden mb-6"></div>
              <div className="text-center flex flex-col items-center">
                <div className="h-3 w-16 bg-gray-200 rounded mb-4"></div>
                <div className="h-5 w-48 bg-gray-200 rounded mb-3"></div>
                <div className="h-8 w-64 bg-gray-200 rounded mb-4"></div>
                <div className="h-5 w-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))
        ) : (
          filteredProducts.map((product, index) => {
            const inWishlist = isInWishlist(product.id);
            
            return (
            <motion.div 
              key={product.id} 
              className="group cursor-pointer"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: (index % 4) * 0.1 }}
            >
              <div 
                className="relative aspect-[4/5] bg-white rounded-lg overflow-hidden mb-6 border border-black/5 group-hover:border-[var(--color-gold)] transition-colors"
                onMouseMove={(e) => {
                  const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
                  const x = (e.clientX - left) / width * 100;
                  const y = (e.clientY - top) / height * 100;
                  const img = e.currentTarget.querySelector('img');
                  if (img) {
                    img.style.transformOrigin = `${x}% ${y}%`;
                  }
                }}
                onMouseLeave={(e) => {
                  const img = e.currentTarget.querySelector('img');
                  if (img) {
                    img.style.transformOrigin = 'center center';
                  }
                }}
              >
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                  <button 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      toggleWishlistItem({
                        productId: product.id,
                        name: product.name,
                        price: product.price.toString(),
                        image: product.image,
                        category: product.category,
                        isCustom: false
                      });
                    }}
                    className="w-9 h-9 flex items-center justify-center bg-white rounded-full shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    <Heart size={18} fill={inWishlist ? "var(--color-gold)" : "none"} color={inWishlist ? "var(--color-gold)" : "gray"} />
                  </button>
                  <div className="group/share relative">
                    <button 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          if (navigator.share) {
                            navigator.share({
                              title: product.name,
                              text: `Check out ${product.name} at our store!`,
                              url: window.location.origin + `/collections?category=${product.category}`
                            }).catch(console.error);
                          }
                        }}
                        className="w-9 h-9 flex items-center justify-center bg-white rounded-full shadow-sm hover:shadow-md transition-all active:scale-95"
                        title="Share this product"
                    >
                        <Share2 size={16} className="text-gray-500 group-hover/share:text-[var(--color-gold)] transition-colors" />
                    </button>
                    <div className="absolute top-0 right-full mr-2 flex flex-row items-center gap-2 opacity-0 pointer-events-none group-hover/share:opacity-100 group-hover/share:pointer-events-auto transition-all bg-white px-3 py-2 rounded-full shadow-md translate-x-2 group-hover/share:translate-x-0">
                        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '/collections?category=' + product.category)}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600 transition-colors" onClick={e => e.stopPropagation()} title="Share on Facebook">
                          <Facebook size={16} />
                        </a>
                        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out ' + product.name)}&url=${encodeURIComponent(window.location.origin + '/collections?category=' + product.category)}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400 transition-colors" onClick={e => e.stopPropagation()} title="Share on Twitter">
                          <Twitter size={16} />
                        </a>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(window.location.origin + '/collections?category=' + product.category); alert('Link copied to clipboard!'); }} className="text-gray-500 hover:text-gray-800 transition-colors" title="Copy Link">
                          <LinkIcon size={16} />
                        </button>
                    </div>
                  </div>
                </div>
                <img 
                  src={product.image} 
                  alt={product.name} 
                  loading="lazy"
                  className="w-full h-full object-cover mix-blend-multiply transition-transform duration-300 ease-out group-hover:scale-[2]"
                />
                <button 
                  onClick={(e) => { e.preventDefault(); addToCart(product); }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gold-gradient text-white p-3 rounded-full opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl hover:opacity-90 hover:scale-105 z-10"
                  title="Add to Bag"
                >
                  <ShoppingBag size={20} className="stroke-white" strokeWidth={2} />
                </button>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-gold)] mb-2 font-bold">{product.category}</p>
                <h3 className="font-serif text-lg md:text-xl mb-2 text-[var(--color-ink)]">{product.name}</h3>
                <p className="text-sm opacity-70 mb-4 line-clamp-2 px-2 h-10">{product.description}</p>
                <p className="font-sans font-medium text-lg text-[var(--color-ink)]">Starts from LKR {product.price.toLocaleString()}</p>
              </div>
            </motion.div>
          );
        })
      )}
      </div>
    </div>
  );
}
