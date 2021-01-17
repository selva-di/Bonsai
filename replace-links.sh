#!/bin/bash

declare -a dirs=("css" "downloads" "examples" "i18n" "images" "js" "lib" "partials" "tests")

#: << 'ENDE_KOMMENTAR'
echo "Web-Root"
filelist=$(find . -maxdepth 1 \( -name '*.html' -o -name '*.js' \) )
for file in $filelist
do
    echo working on $file    
    for name in ${dirs[@]}
    do
        #break
        #echo "  "Substitution $name
        sed -i 's/\"\/'"$name"'/\"'"$name"'/g' $file #> $file.new
    done
done

echo "Erste Unterebene"
filelist=$(find */ -maxdepth 1 \( -name '*.html' -o -name '*.js' \) )
for file in $filelist
do
    echo working on $file    
    for name in ${dirs[@]}
    do
        #break
        #echo "  "Substitution $name
        sed -i 's/\"\/'"$name"'/\"\.\.\/'"$name"'/g' $file #> $file.new
        sed -i 's/'"'"'\/'"$name"'/'"'"'\.\.\/'"$name"'/g' $file #> $file.new
    done
done

echo "Zweite Unterebene"
filelist=$(find */*/ -maxdepth 1 \( -name '*.html' -o -name '*.js' \) )
for file in $filelist
do
    echo working on $file    
    for name in ${dirs[@]}
    do
        #break
        #echo "  "Substitution $name
        sed -i 's/\"\/'"$name"'/\"\.\.\/\.\.\/'"$name"'/g' $file #> $file.new
        sed -i 's/'"'"'\/'"$name"'/'"'"'\.\.\/\.\.\/'"$name"'/g' $file #> $file.new
    done
done

echo "Dritte Unterebene"
filelist=$(find */*/*/ -maxdepth 1 \( -name '*.html' -o -name '*.js' \) )
for file in $filelist
do
    echo working on $file    
    for name in ${dirs[@]}
    do
        #break
        #echo "  "Substitution $name
        sed -i 's/\"\/'"$name"'/\"\.\.\/\.\.\/\.\.\/'"$name"'/g' $file #> $file.new
        sed -i 's/'"'"'\/'"$name"'/'"'"'\.\.\/\.\.\/\.\.\/'"$name"'/g' $file #> $file.new
    done
done

: << 'ENDE_KOMMENTAR'

echo "== Vierte Unterebene"
filelist=$(find */*/*/*/ -maxdepth 1 \( -name '*.html' -o -name '*.js'   \) )
for file in $filelist
do
    echo working on $file    
    for name in ${dirs[@]}
    do
        break
        #echo "  "Substitution $name
        #sed -i 's/\"\/'"$name"'\//'"$name\//g" $file #> $file.new
    done
done

ENDE_KOMMENTAR
