// (c) Jacob Lundberg 2013-2018

PBB = 45500 // prisbasbelopp 2018
skatt = 0
grundavdrag = 0
JSA = 0 // jobbskatteavdrag
arslon = 0
lonefterskatt = 0
skattutanjsa = 0
statsskatt = 0
AGA = 0.3142 // arbetsgivaravgift


google.load('visualization', '1', {'packages':["corechart"]})

// returnera datum

function datum(date) {
months = new Array("januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december")

return '' + date.getDate() + ' ' + months[date.getMonth()]
}


// tusentalsgruppering

function tusental(nStr)
{
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ' ' + '$2');
	}
	return x1 + x2;
}


// avrundning och formatering av tal som ska visas

function avrunda(num) {
num = Math.round(num)
if(num < 0) {
num = -num
negativ = true
} else {
negativ = false
}

num = tusental(num)

if(negativ)
return '&minus;' + num
else
return num
}


// funktion som körs när formuläret ändras eller skickas

function raknaut() {
arslon = document.form.lon.value * 12
kommunskatt = document.form.kommun.value / 100
// procentmat = document.form.procentmat.value / 100
// procentbocker = document.form.procentbocker.value / 100
// procentannat = document.form.procentannat.value / 100
// ungdom = document.form.ungdom.checked

marginalskatt = 0

// dagens skattesystem

// grundavdrag

if(arslon > 0 && arslon < 0.99*PBB) {
grundavdrag = Math.ceil(0.423*PBB/100)*100
}

else if(arslon >= 0.99*PBB && arslon < 2.72*PBB) {
grundavdrag = Math.ceil((0.225*PBB+0.2*arslon)/100)*100
}

else if(arslon >= 2.72*PBB && arslon < 3.11*PBB) {
grundavdrag = Math.ceil(0.770*PBB/100)*100
}

else if(arslon >= 3.11*PBB && arslon < 7.88*PBB) {
grundavdrag = Math.ceil((1.081*PBB-0.1*arslon)/100)*100
}

else if(arslon >= 7.88*PBB) {
grundavdrag = Math.ceil(0.293*PBB/100)*100
}

else {
resultat.innerHTML = 'Skriv bara siffror utan mellanslag eller kommatecken.<p>'
return
}


// jobbskatteavdrag

if(arslon > 0 && arslon < 0.91*PBB) {
marginalskatt = 0
JSA = (arslon - grundavdrag) * kommunskatt
if(JSA < 0)
JSA = 0
}

else if(arslon >= 0.91*PBB && arslon < 2.94*PBB) {
marginalskatt = kommunskatt * (1 - 0.332)
JSA = (0.91*PBB + 0.332*(arslon - 0.91*PBB) - grundavdrag)*kommunskatt
}

else if(arslon >= 2.94*PBB && arslon < 8.08*PBB) {
marginalskatt = kommunskatt * (1 - 0.111)
JSA = (1.584*PBB + 0.111*(arslon - 2.94*PBB) - grundavdrag)*kommunskatt
}

else if(arslon >= 8.08*PBB && arslon < 13.54*PBB) {
marginalskatt = kommunskatt
JSA = (2.155*PBB - grundavdrag)*kommunskatt
}

else if(arslon >= 13.54*PBB) {
marginalskatt = kommunskatt + 0.03
JSA = Math.max(0, (2.155*PBB - grundavdrag)*kommunskatt - 0.03 * (arslon - 13.54*PBB))
}

skattutanjsa = Math.round((arslon - grundavdrag) * kommunskatt)

if(skattutanjsa < 0)
skattutanjsa = 0


// statlig inkomstskatt 2018

statsskatt = 0

if(arslon > 468700) {
statsskatt = (arslon - 468700) * 0.2
marginalskatt += 0.2
}

if(arslon > 675700) {
statsskatt += (arslon - 675700) * 0.05
marginalskatt += 0.05
}


skatt = Math.round(skattutanjsa - JSA + statsskatt)

// begravningsavgift 2017 (ej Stockholm och Tranås)
begravning = 0.00242

// begravningsavgift i Stockholm
if(kommunskatt == 0.2998) {
begravning = 0.00075
}

begravningsavgift = Math.max(0, (arslon - grundavdrag) * begravning)


// allmän pensionsavgift

apa = 0

if(arslon >= Math.ceil(0.423*PBB/100)*100) {
apa = Math.round((0.07 * Math.floor(arslon/100)*100)/100)*100
if(apa < skatt)
apa = 0
else
apa = apa - skatt

}

lonefterskatt = Math.round(arslon - skatt - apa - begravningsavgift)

// if(ungdom)
// arbetsgivaravgift = AGAU
// else
arbetsgivaravgift = AGA


arbetsgivaravgiftperar = arslon * arbetsgivaravgift

totalarslon = arslon + arbetsgivaravgiftperar

// viktadmoms = 0.25 / 1.25 * procentannat + 0.12 / 1.12 * procentmat + 0.06 / 1.06 * procentbocker
// viktadmoms = 0.2097
viktadmoms = 0.19

moms = viktadmoms * lonefterskatt

totalmarginalskatt = (marginalskatt + (1 - marginalskatt) * viktadmoms + arbetsgivaravgift) / (1 + arbetsgivaravgift)

totalskatt = moms + arbetsgivaravgiftperar + skatt + apa + begravningsavgift

totalsnittskatt = totalskatt / totalarslon


tusenlapparskatt = Math.round(totalskatt / 12 / 1000)
tusenlapparkvar = Math.round((lonefterskatt - moms) / 12 / 1000)

skattefridag = new Date(365 * 24 * 60 * 60 * 1000 * totalsnittskatt) // millisekunder in på 1970 (1970 ej skottår)


/*
var data = google.visualization.arrayToDataTable([
          ['Skatt', 'Kronor per månad'],
          ['Arbetsgivaravgift',     Math.round(arbetsgivaravgiftperar / 12)],
          ['Allmän pensionsavgift',     Math.round(apa / 12)],
          ['Kommunalskatt',  Math.round((skattutanjsa - JSA + begravningsavgift) / 12)],
          ['Statlig skatt', Math.round(statsskatt / 12)],
          ['Moms och punktskatter',    Math.round(moms / 12)],
          ['Kvar till dig',    Math.round((lonefterskatt - moms) / 12)]
        ]);


        var options = {
          title: 'Vad händer med dina pengar?',
          pieSliceText: 'value',
	  legend: 'bottom',
	  width: 700
        };

        var chart = new google.visualization.PieChart(document.getElementById('piechart'));

        chart.draw(data, options);

*/
// output


banknotetext = '<img src=tusenlapp.jpg width=100 class=tusenlapp> '

output = '<h2>Vem får dina pengar?</h2><div class="card box-shadow inner-content">Medräknat arbetsgivaravgifter har du tjänat in <span class="bold sizeup"> ' + avrunda(totalarslon / 12) + ' kr</span><br/> Vem får pengarna?<p>'
	
// illustration med sedlar
output += '<div class="table"><table class="table table-responsive"><tr><td>DU<br><span class="sizeup">' + avrunda((lonefterskatt - moms) / 12) + ' kr</span> (' + Math.round((1 - totalsnittskatt) * 100) + '&nbsp;%)</td><td>STATEN<br><span class="sizeup">' + avrunda(totalskatt / 12) + ' kr</span> (' + Math.round(totalsnittskatt * 100) + '&nbsp;%)</td></tr>'

// utan uppdelning av tusenlapparna i skatt
// output += '<tr><td>' + banknotetext.repeat(tusenlapparkvar) + '</td><td>' + banknotetext.repeat(tusenlapparskatt) + '</td></tr></table></div></div>'

// med uppdelning av skattetusenlapparna
output += '<tr><td width=50%>' + banknotetext.repeat(tusenlapparkvar) + '</td><td width=50%>Arbetsgivaravgifter:<br>' + banknotetext.repeat(Math.round(arbetsgivaravgiftperar / 12 / 1000)) + '<br><br>Inkomstskatt:<br>' + banknotetext.repeat(Math.round((skatt + apa + begravningsavgift)/ 12 / 1000)) + '<br><br>Moms och punktskatter:<br>' + banknotetext.repeat(Math.round(moms / 12 / 1000)) + '</tr></table></div></div>'
	
// tabell som specificerar inkomst och skatter
output += '<br/><h2>Dina skatter</h2><div class="skattewrap inner-content"><div class="table"><table class="table table-striped table-skatter"><tr><td><b>Arbetsgivarens kostnad</b></td><td align=right><b>' + avrunda(totalarslon / 12) + '</b></td></tr><tr><td>Arbetsgivaravgifter</td><td align=right>' + avrunda(-arbetsgivaravgiftperar / 12) + '</td></tr>'
output += '<tr><td><b>Din månadslön</b></td><td align=right><b>' + avrunda(arslon / 12) + '</b></td></tr><tr><td>Kommunalskatt</td><td align=right>' + avrunda(-skattutanjsa / 12) + '</td></tr><tr><td>Jobbskatteavdrag</td><td align=right>' + avrunda(JSA / 12) + '</td></tr>'
 
// statlig inkomstskatt
if(statsskatt > 0)
output += '<tr><td>Statlig inkomstskatt</td><td align=right>' + avrunda(-statsskatt / 12) + '</td></tr>'

// allmän pensionsavgift
if(apa > 0)
output += '<tr><td>Allmän pensionsavgift</td><td align=right>' + avrunda(-apa / 12) + '</td></tr>'

// begravningsavgift
if(begravningsavgift > 0)
output += '<tr><td>Begravningsavgift</td><td align=right>' + avrunda(-begravningsavgift / 12) + '</td></tr>'

// output += '<tr><td><font color=red><b>Summa skatt</b></font></td><td align=right><font color=red><b>' + avrunda(-(skatt + apa) / 12) + '</b></font></td></tr>'

output += '<tr><td><b>Lön efter skatt</b></td><td align=right><b>' + avrunda(lonefterskatt / 12) + '</b></td></tr>'

output += '<tr><td>Moms och punktskatter*</td><td align=right>' + avrunda(-moms / 12) + '</td></tr>'
	
output += '<tr><td><b>Kvar efter alla skatter</b></td><td align=right><b>' + avrunda((lonefterskatt - moms) / 12) + '</b></td></tr>'

output += '<tr><td><font color=red><b>Summa skatter</b></font></td><td align=right><font color=red><b>' + avrunda(-totalskatt / 12) + '</b></font></td></tr></table><p></div>* Beräknat på snittet i befolkningen.'

// output += 'Du betalar ' + avrunda(moms / 12) + ' kr i moms varje månad.<p>'

// output += 'Din arbetsgivare betalar dessutom ' + avrunda(arbetsgivaravgiftperar / 12) + ' kr per månad i skatt i form av arbetsgivaravgift. Det du tjänar ihop totalt är därför ' + avrunda(totalarslon / 12) + ' kr.<p>'

// output += 'Totala skatter som andel av arbetsgivarens kostnad är ' + avrunda(totalsnittskatt * 100) + ' procent. </div>'

// output += 'Du får alltså behålla ' + avrunda((1 - totalsnittskatt) * 100) + ' procent av det du tjänat ihop.<p>'

// output += 'Din skattefridag infaller den ' + datum(skattefridag) + '. Då har ' + avrunda(totalsnittskatt * 100) + ' procent av året gått och du har betalat klart årets skatter och börjar tjäna in pengar till dig själv.<p>'

resultat.innerHTML = output

// marginalskattresultat.innerHTML = '<h3>Marginalskatt</h3>Din marginalskatt  skatt på sist intjänade hundralappen  är ' + avrunda(marginalskatt * 100) + ' procent om man bara räknar inkomstskatten. Lägger man till arbetsgivaravgift, moms och punktskatter får man din effektiva marginalskatt, som är ' + avrunda(totalmarginalskatt * 100) + ' procent.'
}
