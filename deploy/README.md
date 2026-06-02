# Déploiement — site always-on (systemd)

Le dashboard tourne en **build de production** sous **systemd** (`clara-hub.service`), donc :
- **redémarre tout seul** en cas de plantage (`Restart=always`) ;
- **démarre au boot** de la machine (`enable`) ;
- plus rapide que `npm run dev`.

## Installation (déjà faite sur 333SRV)
```bash
sudo cp deploy/clara-hub.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now clara-hub
```

## Gérer le service
```bash
systemctl status clara-hub        # état
sudo systemctl restart clara-hub  # redémarrer
journalctl -u clara-hub -f        # logs en direct
```

## ⚠️ Après une modification de CODE → redéployer
Le code servi est le **build** (`.next`), pas les sources en direct. Donc après un changement :
```bash
cd ~/ClaraAFJV
npm run build
sudo systemctl restart clara-hub
```
> La **collecte** (cron `npm run collect`) met à jour les **données** sans rebuild : le dashboard
> étant dynamique (lecture DB à chaque requête), les nouvelles offres apparaissent sans redéploiement.

Site : **http://192.168.1.175:3002** (LAN).
