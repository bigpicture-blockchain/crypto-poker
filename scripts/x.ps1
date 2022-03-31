GNU nano 4.8                                                               x.ps1                                                                         
git rev-parse --short HEAD | Out-File -FilePath .version -Encoding UTF8
$cdn = ""
$version = Get-Content .version

#(Get-Content ./poker.ui/src/style.scss).replace("`$cdn: '';", "`$cdn: '${cdn}/';") | Set-Content ./poker.ui/src/style.scss
#(Get-Content ./poker.ui/src/cards.scss).replace("`$cdn: '';", "`$cdn: '${cdn}/';") | Set-Content ./poker.ui/src/cards.scss
#(Get-Content ./poker.ui/src/flags16.scss).replace("`$cdn: '';", "`$cdn: '${cdn}/';") | Set-Content ./poker.ui/src/flags16.scss

cd ../poker.ui/
#dir scripts/*.js -Recurse -Force | Remove-Item
Remove-Item ./scripts -Recurse -Force

sudo apt install python2 -y

npm install
sudo npm install aurelia-cli -g
sudo npm install typescript -g
au build --env prod

Write-Host "Renaming bundled files..."
mv ./scripts/app-bundle.js ./scripts/app-bundle-$version.js
mv ./scripts/vendor-bundle.js ./scripts/vendor-bundle-$version.js
(Get-Content index.html).replace('scripts/vendor-bundle.js', "scripts/vendor-bundle-$version.js") | Set-Content index.html
(Get-Content index.html).replace('http://localhost:9000', $cdn) | Set-Content index.html
(Get-Content "./scripts/vendor-bundle-$version.js").replace('../scripts/app-bundle', "$cdn/scripts/app-bundle-${version}") | Set-Content "./scripts/vendor-bundle-$version.js"

cd ../

Write-Host "Creating pgm.zip"

del ./pgm.zip
mkdir -p build && cp poker.ui/*.html ./build/.
cp poker.ui/favicon.ico ./build/.
cp poker.ui/images/. ./build/images/ -r
cp poker.ui/scripts/. ./build/scripts/ -r
cp poker.ui/sounds/. ./build/sounds/ -r

cp ./build/. /var/www/poker.site/. -r

Remove-Item -Recurse -Force ./poker.engine/build/

cd poker.engine

sudo npm install
(Get-Content src/environment.ts).replace('debug: true', "debug: false") | Set-Content src/environment.ts
tsc
if($LASTEXITCODE -ne 0)
{
    Write-Host "ERROR! poker.engine tsc failed! $LASTEXITCODE" 
	exit
}
Write-Host "tsc completed successfully" 
cd ..

cp poker.engine/. /opt/poker/poker.engine/. -r

cd /opt/poker/poker.engine/

#forever start --killSignal=SIGTERM ./build/poker.engine/src/app.js
#node ./build/poker.engine/src/app.js