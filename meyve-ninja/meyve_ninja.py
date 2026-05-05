import cv2
import mediapipe as mp
import pygame
import random
import math
import sys
import time

# --- Başlangıç ayarları ---
GENISLIK, YUKSEKLIK = 900, 650
FPS = 60

# Renkler
ARKA_PLAN   = (15, 10, 25)
BEYAZ       = (255, 255, 255)
SARI        = (255, 220, 50)
KIRMIZI     = (220, 60, 60)
YESIL       = (60, 200, 100)
TURUNCU     = (255, 140, 30)
PEMBE       = (255, 100, 180)
ACIK_MAVI   = (100, 200, 255)
GRI         = (120, 120, 120)

MEYVELER = [
    {"ad": "karpuz",  "renk": (60, 180, 60),   "ic": (220, 50, 50),   "r": 38},
    {"ad": "portakal","renk": (220, 120, 30),   "ic": (255, 200, 80),  "r": 30},
    {"ad": "elma",    "renk": (200, 40, 40),    "ic": (255, 180, 160), "r": 28},
    {"ad": "limon",   "renk": (220, 210, 30),   "ic": (255, 240, 120), "r": 25},
    {"ad": "uzum",    "renk": (140, 60, 180),   "ic": (200, 150, 220), "r": 22},
]

class Meyve:
    def __init__(self):
        self.veri = random.choice(MEYVELER)
        self.x = random.randint(60, GENISLIK - 60)
        self.y = YUKSEKLIK + 50
        self.hiz_x = random.uniform(-2.5, 2.5)
        self.hiz_y = random.uniform(-16, -12)
        self.yer_cekimi = 0.35
        self.r = self.veri["r"]
        self.kesik = False
        self.kesik_zaman = 0
        self.parca1_aci = random.uniform(-0.4, 0.4)
        self.parca1_hiz = [-abs(self.hiz_x) - 1, self.hiz_y * 0.6]
        self.parca2_hiz = [abs(self.hiz_x) + 1, self.hiz_y * 0.6]
        self.parca1_pos = [self.x, self.y]
        self.parca2_pos = [self.x, self.y]
        self.alfa = 255
        self.don = 0
        self.don_hiz = random.uniform(-3, 3)

    def guncelle(self):
        if not self.kesik:
            self.hiz_y += self.yer_cekimi
            self.x += self.hiz_x
            self.y += self.hiz_y
            self.don += self.don_hiz
        else:
            for p, h in [(self.parca1_pos, self.parca1_hiz),
                         (self.parca2_pos, self.parca2_hiz)]:
                h[1] += self.yer_cekimi
                p[0] += h[0]
                p[1] += h[1]
            self.alfa = max(0, self.alfa - 8)

    def ekrana_ciz(self, yuzey):
        if not self.kesik:
            self._meyve_ciz(yuzey, int(self.x), int(self.y), self.r,
                            self.veri["renk"], self.veri["ic"], self.don)
        else:
            if self.alfa > 0:
                self._yarim_meyve(yuzey, self.parca1_pos, self.parca2_pos,
                                  self.r, self.veri["renk"], self.veri["ic"], self.alfa)

    def _meyve_ciz(self, yuzey, x, y, r, renk, ic, don):
        surf = pygame.Surface((r*2+4, r*2+4), pygame.SRCALPHA)
        cx, cy = r+2, r+2
        pygame.draw.circle(surf, renk, (cx, cy), r)
        pygame.draw.circle(surf, ic, (cx, cy), int(r * 0.55))
        # parlama
        pygame.draw.circle(surf, (255, 255, 255, 80),
                           (cx - r//3, cy - r//3), r//4)
        rot = pygame.transform.rotate(surf, don)
        rect = rot.get_rect(center=(x, y))
        yuzey.blit(rot, rect)

    def _yarim_meyve(self, yuzey, p1, p2, r, renk, ic, alfa):
        for px, py, flip in [(int(p1[0]), int(p1[1]), False),
                              (int(p2[0]), int(p2[1]), True)]:
            surf = pygame.Surface((r*2+4, r*2+4), pygame.SRCALPHA)
            cx, cy = r+2, r+2
            pygame.draw.circle(surf, (*renk, alfa), (cx, cy), r)
            pygame.draw.circle(surf, (*ic, alfa), (cx, cy), int(r * 0.55))
            pygame.draw.line(surf, (255, 255, 255, alfa),
                             (cx, cy - r), (cx, cy + r), 2)
            if flip:
                surf = pygame.transform.flip(surf, True, False)
            yuzey.blit(surf, surf.get_rect(center=(px, py)))

    def ekrandan_cikti_mi(self):
        if self.kesik:
            return self.alfa <= 0
        return self.y > YUKSEKLIK + 100

    def kes(self):
        self.kesik = True
        self.kesik_zaman = time.time()
        self.parca1_pos = [self.x, self.y]
        self.parca2_pos = [self.x, self.y]


class KesizEfekti:
    def __init__(self, x, y):
        self.noktalar = [(x, y)]
        self.zaman = time.time()
        self.sure = 0.4

    def ekle(self, x, y):
        self.noktalar.append((x, y))
        if len(self.noktalar) > 12:
            self.noktalar.pop(0)

    def ciz(self, yuzey):
        kalan = 1 - (time.time() - self.zaman) / self.sure
        if kalan <= 0 or len(self.noktalar) < 2:
            return
        for i in range(1, len(self.noktalar)):
            t = i / len(self.noktalar)
            alfa = int(255 * t * kalan)
            kalinlik = max(1, int(4 * t * kalan))
            renk = (
                int(255 * kalan),
                int(200 * t * kalan),
                int(100 * kalan)
            )
            pygame.draw.line(yuzey, renk,
                             self.noktalar[i-1], self.noktalar[i], kalinlik)

    def bitti_mi(self):
        return time.time() - self.zaman > self.sure


class PuanEfekti:
    def __init__(self, x, y, metin, renk=SARI):
        self.x = x
        self.y = y
        self.metin = metin
        self.renk = renk
        self.zaman = time.time()
        self.sure = 1.0

    def guncelle_ve_ciz(self, yuzey, font):
        kalan = 1 - (time.time() - self.zaman) / self.sure
        if kalan <= 0:
            return False
        self.y -= 1.5
        alfa = int(255 * kalan)
        surf = font.render(self.metin, True, self.renk)
        surf.set_alpha(alfa)
        yuzey.blit(surf, (int(self.x) - surf.get_width()//2, int(self.y)))
        return True


def ana():
    # MediaPipe
    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(
        max_num_hands=1,
        min_detection_confidence=0.7,
        min_tracking_confidence=0.6
    )
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    pygame.init()
    ekran = pygame.display.set_mode((GENISLIK, YUKSEKLIK))
    pygame.display.set_caption("🍉 Meyve Ninja — El ile Kes!")
    saat = pygame.time.Clock()

    buyuk_font  = pygame.font.SysFont("Arial", 52, bold=True)
    orta_font   = pygame.font.SysFont("Arial", 30, bold=True)
    kucuk_font  = pygame.font.SysFont("Arial", 20)

    meyveler    = []
    efektler    = []
    puan_efektleri = []
    puan        = 0
    can         = 3
    aktif_iz    = None
    onceki_el   = None
    son_meyve   = time.time()
    meyve_aralik = 1.0
    oyun_bitti  = False
    basla_zamani = time.time()
    combo       = 0
    son_kesik   = time.time()

    # Yıldız parçacıkları arka plan için
    yildizlar = [(random.randint(0, GENISLIK), random.randint(0, YUKSEKLIK),
                  random.uniform(0.3, 1.5)) for _ in range(80)]

    def arka_plan_ciz():
        ekran.fill(ARKA_PLAN)
        for (sx, sy, par) in yildizlar:
            alfa = int(80 + 60 * math.sin(time.time() * par + sy))
            r = int(1 + par * 0.5)
            pygame.draw.circle(ekran, (alfa, alfa, alfa+30), (sx, sy), r)

    def canlar_ciz():
        for i in range(3):
            renk = KIRMIZI if i < can else GRI
            cx = 30 + i * 38
            pygame.draw.circle(ekran, renk, (cx, 30), 14)
            if i >= can:
                pygame.draw.line(ekran, (60,60,60), (cx-10, 20), (cx+10, 40), 2)

    while True:
        dt = saat.tick(FPS)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                cap.release()
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r and oyun_bitti:
                    ana()
                    return
                if event.key == pygame.K_ESCAPE:
                    cap.release()
                    pygame.quit()
                    sys.exit()

        # Kamera oku
        ret, frame = cap.read()
        el_poz = None
        if ret:
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            sonuc = hands.process(frame_rgb)
            if sonuc.multi_hand_landmarks:
                el = sonuc.multi_hand_landmarks[0]
                # İşaret parmağı ucu (8. landmark)
                lm = el.landmark[8]
                # Kamera aynada göründüğü için x'i ters çevir
                el_poz = (
                    int((1 - lm.x) * GENISLIK),
                    int(lm.y * YUKSEKLIK)
                )

        if not oyun_bitti:
            # Yeni meyve ekle
            if time.time() - son_meyve > meyve_aralik:
                meyveler.append(Meyve())
                son_meyve = time.time()
                meyve_aralik = max(0.5, meyve_aralik - 0.003)

            # El izi takibi ve kesme
            if el_poz:
                if aktif_iz is None:
                    aktif_iz = KesizEfekti(*el_poz)
                else:
                    aktif_iz.ekle(*el_poz)
                efektler.append(KesizEfekti(*el_poz))

                # Hareket vektörü
                if onceki_el:
                    dx = el_poz[0] - onceki_el[0]
                    dy = el_poz[1] - onceki_el[1]
                    hiz = math.sqrt(dx*dx + dy*dy)

                    if hiz > 8:  # Minimum hız eşiği
                        for m in meyveler[:]:
                            if not m.kesik:
                                dist = math.sqrt(
                                    (el_poz[0] - m.x)**2 +
                                    (el_poz[1] - m.y)**2
                                )
                                if dist < m.r + 15:
                                    m.kes()
                                    # Combo sistemi
                                    if time.time() - son_kesik < 1.0:
                                        combo += 1
                                    else:
                                        combo = 1
                                    son_kesik = time.time()

                                    kazanilan = combo
                                    puan += kazanilan
                                    metin = f"+{kazanilan}"
                                    if combo >= 3:
                                        metin += f" COMBO x{combo}!"
                                    puan_efektleri.append(
                                        PuanEfekti(m.x, m.y - 20, metin,
                                                   TURUNCU if combo >= 3 else SARI)
                                    )
                onceki_el = el_poz
            else:
                aktif_iz = None
                onceki_el = None

            # Güncelle
            for m in meyveler[:]:
                m.guncelle()
                if m.ekrandan_cikti_mi():
                    if not m.kesik:
                        can -= 1
                        puan_efektleri.append(
                            PuanEfekti(m.x, YUKSEKLIK - 60, "Miss!", KIRMIZI)
                        )
                    meyveler.remove(m)

            efektler = [e for e in efektler if not e.bitti_mi()]

            if can <= 0:
                oyun_bitti = True

        # Çiz
        arka_plan_ciz()

        for m in meyveler:
            m.ekrana_ciz(ekran)

        for e in efektler:
            e.ciz(ekran)

        if el_poz:
            pygame.draw.circle(ekran, ACIK_MAVI, el_poz, 10)
            pygame.draw.circle(ekran, BEYAZ, el_poz, 10, 2)

        # UI
        canlar_ciz()

        puan_surf = buyuk_font.render(str(puan), True, BEYAZ)
        ekran.blit(puan_surf, (GENISLIK//2 - puan_surf.get_width()//2, 15))

        sure = int(time.time() - basla_zamani)
        sure_surf = kucuk_font.render(f"{sure}s", True, GRI)
        ekran.blit(sure_surf, (GENISLIK - 60, 15))

        puan_efektleri = [
            pe for pe in puan_efektleri
            if pe.guncelle_ve_ciz(ekran, orta_font)
        ]

        if oyun_bitti:
            karanlik = pygame.Surface((GENISLIK, YUKSEKLIK), pygame.SRCALPHA)
            karanlik.fill((0, 0, 0, 160))
            ekran.blit(karanlik, (0, 0))

            bitti_surf = buyuk_font.render("OYUN BİTTİ", True, KIRMIZI)
            ekran.blit(bitti_surf,
                       (GENISLIK//2 - bitti_surf.get_width()//2, YUKSEKLIK//2 - 80))

            puan_yazi = orta_font.render(f"Puan: {puan}", True, SARI)
            ekran.blit(puan_yazi,
                       (GENISLIK//2 - puan_yazi.get_width()//2, YUKSEKLIK//2))

            yeniden = orta_font.render("[ R ] Tekrar Oyna   [ ESC ] Çıkış", True, BEYAZ)
            ekran.blit(yeniden,
                       (GENISLIK//2 - yeniden.get_width()//2, YUKSEKLIK//2 + 60))

        pygame.display.flip()

    cap.release()
    pygame.quit()


if __name__ == "__main__":
    ana()
