GNU nano 4.8                                                               x.ps1                                                                         
git rev-parse --short HEAD | Out-File -FilePath .version -Encoding UTF8
$cdn = ""
$version = Get-Content .version

#(Get-Content ./poker.ui/src/style.scss).replace("`$cdn: '';", "`$cdn: '${cdn}/';") | Set-Content ./poker.ui/src/style.scss
#(Get-Content ./poker.ui/src/cards.scss).replace("`$cdn: '';", "`$cdn: '${cdn}/';") | Set-Content ./poker.ui/src/cards.scss
#(Get-Content ./poker.ui/src/flags16.scss).replace("`$cdn: '';", "`$cdn: '${cdn}/';") | Set-Content ./poker.ui/src/flags16.scss

Write-Host "here"


cd poker.ui/
#dir scripts/*.js -Recurse -Force | Remove-Item
Remove-Item ./scripts -Recurse -Force
npm install
au build --env prod

Write-Host "There"

Write-Host "Renaming bundled files..."
mv ./scripts/app-bundle.js ./scripts/app-bundle-$version.js
mv ./scripts/vendor-bundle.js ./scripts/vendor-bundle-$version.js
(Get-Content index.html).replace('scripts/vendor-bundle.js', "scripts/vendor-bundle-$version.js") | Set-Content index.html
(Get-Content index.html).replace('http://localhost:9000', $cdn) | Set-Content index.html
(Get-Content "./scripts/vendor-bundle-$version.js").replace('../scripts/app-bundle', "$cdn/scripts/app-bundle-${version}") | Set-Content "./scripts/vendor>

cd ../

Write-Host "Creating pgm.zip"

del ./pgm.zip
mkdir -p trs && cp poker.ui/*.html ./trs/.
cp poker.ui/favicon.ico ./trs/.
cp poker.ui/images/. ./trs/images/ -r
cp poker.ui/scripts/. ./trs/scripts/ -r
cp poker.ui/sounds/. ./trs/sounds/ -r