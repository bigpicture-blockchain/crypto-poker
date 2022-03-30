#!/bin/bash

USER=cpokeradmin

#add user
useradd -u 1002 -s /bin/bash -m -p $(openssl passwd -1 p4zzw0aab) $USER 
usermod -aG sudo $USER
usermod -aG www-data $USER
#update password afterwards using command 'passwd'

#enable PasswordAuthentication
sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/g' /etc/ssh/sshd_config; 

#disable root login
sed -i 's/PermitRootLogin yes/PermitRootLogin no/g' /etc/ssh/sshd_config; 
systemctl restart sshd;

#things missing from base install
apt update
apt upgrade -y
apt-get install software-properties-common curl -y

#letsencrypt
#add-apt-repository ppa:certbot/certbot -yes
apt install certbot

#nodejs
curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -

#apt-get update not required as nodejs setup script above calls it
service apache2 stop
apt-get remove apache2 -y
apt-get install ufw unzip zip ntp git fail2ban build-essential nginx python3-certbot-nginx nodejs -y

#configure firewall
ufw allow 22
ufw --force enable
ufw allow 'Nginx Full'
ufw status verbose

#install forever
npm install forever -g

#mongodb
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
apt-get update
apt-get install -y mongodb-org
systemctl start mongod
systemctl enable mongod

#sudo -u $USER cp /tmp/install_files/*.sh /home/$USER
cp ./vagrant/game_server/install_files/* /home/$USER
cp ./vagrant/game_server/install_files/.htpasswd /home/$USER/.htpasswd
chmod +x /home/$USER/*.sh

#setup websites
cp /home/$USER/poker_site_nginx /etc/nginx/sites-available/
ln -s /etc/nginx/sites-available/poker_site_nginx /etc/nginx/sites-enabled/

nginx -t

#cp /tmp/install_files/.htpasswd /etc/nginx/
cp /home/$USER/.htpasswd /etc/nginx/

mkdir -p /opt/poker/poker.engine
#tar -xvf /tmp/install_files/GeoLite2-Country.tar.gz -C /opt/poker/poker.engine --wildcards "*.mmdb" --strip-components 1

#cp /home/$USER/game_server.env /opt/poker.engine/.env
cp /home/$USER/game_server.env /opt/poker/poker.engine/.env

mkdir -p /var/www/poker.site
mkdir -p /var/www/admin.poker.site
chown -R www-data:www-data /var/www/poker.site
chown -R www-data:www-data /var/www/admin.poker.site
chmod 775 /var/www/poker.site
chmod 775 /var/www/admin.poker.site

# Update the list of packages
sudo apt-get update
# Install pre-requisite packages.
sudo apt-get install -y wget apt-transport-https software-properties-common
# Download the Microsoft repository GPG keys
wget -q https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb
# Register the Microsoft repository GPG keys
sudo dpkg -i packages-microsoft-prod.deb
# Update the list of packages after we added packages.microsoft.com
sudo apt-get update
# Install PowerShell
sudo apt-get install -y powershell

#cp /tmp/install_files/poker.service /etc/systemd/system/
#systemctl enable poker.service

#sudo pwsh x.ps1
