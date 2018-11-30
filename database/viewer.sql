-- Warning: restart Tomcat after updating views if you change result type, otherwise this exception may occur:
-- class java.sql.SQLException: ERROR: cached plan must not change result type Query: select * from viewer.viewer_object_details where id = ?

drop schema if exists viewer cascade;
create schema viewer;

-- Used in cache key for ETag to refresh cache when schema of JSON results change,
-- increase value when doing schema updates!
create table viewer.schema_version(value integer);
insert into viewer.schema_version(value) values(6);

create or replace view viewer.viewer_object as
    select d."DBK_ID" as id,
        d."Nummer" as oms_nummer,
        d."Formele_Naam" as formele_naam,
        d."Informele_Naam" as informele_naam,
        d."Bouwlaag_Max" as bouwlaag_max,
        d."Bouwlaag_Min" as bouwlaag_min,
        to_timestamp(nullif(d2."Datum_Controle_Preventie",''), 'YYYYMMDDHH24MISSMS') as datum_controle,
        to_timestamp(nullif(d."Datum_Actualisatie",''), 'YYYYMMDDHH24MISSMS') as datum_actualisatie,
        case 
            when lower(d2."BHVaanwezig") in ('ja', 'yes') then true
            else false
        end as bhv_aanwezig,
        d2.inzetprocedure as inzetprocedure,
        d2."RisicoKlasse" as risicoklasse,
        d2."soortDBK" as symbool,
        d."Adres_ID" as adres_id,
        nullif(d2."Hoofdobject_ID",0) as hoofdobject_id,
        d2."Bouwlaag" as bouwlaag,
        d."Gebruikstype" as gebruikstype,
	d2."Gebruikstype_Specifiek" as gebruikstype_specifiek,
        
        -- Oude bijzonderheden...
        d."Bijzonderheden" as bijzonderheden,
        d."Bijzonderheden2" as bijzonderheden2,
        d."Prev_Bijz_1" as prev_bijz_1,
        d."Prev_Bijz_2" as prev_bijz_2,
        d."Prep_Bijz_1" as prep_bijz_1,
        d."Prep_Bijz_2" as prep_bijz_2,
        d."Repr_Bijz_1" as repr_bijz_1,
        d."Repr_Bijz_2" as repr_bijz_2
        
    from wfs."DBK" d
    left join wfs."DBK2" d2 on (d2."DBK_ID" = d."DBK_ID")
    where
        not coalesce(d."Deleted",false)
        and d2."Viewer"
	    and ( nullif("DatumTijd_Viewer_Begin",'') is null or to_timestamp(d2."DatumTijd_Viewer_Begin", 'YYYYMMDDHH24MISSMS') < now() ) 
	    and ( nullif("DatumTijd_Viewer_Eind",'') is null or to_timestamp(d2."DatumTijd_Viewer_Eind", 'YYYYMMDDHH24MISSMS') > now() )
    -- inclusief verdiepingen!	    
;
comment on view viewer.viewer_object is 'View van wfs.DBK met wfs.DBK2 als basis voor zichtbare objecten voor views voor SLDs; inclusief verdiepingen!';

create or replace view viewer.viewer_object_selectieadressen as
    select "DBK_ID" as id, 
        (select array_to_json(array_agg(row_to_json(r.*)))
         from (select na."Postcode" as pc, na."Plaats" as pl, na."Straatnaam" as sn, 
                array_to_json(array_agg(distinct na."Huisnummer" || case when na."Huisletter" <> '' or na."Toevoeging" <> '' then '|' || COALESCE(na."Huisletter",'') || '|' || COALESCE(na."Toevoeging",'') else '' end)) as nrs
                from wfs."AdresDBKneven" na
                where na."DBK_ID" = t."DBK_ID"
                group by na."Postcode", na."Plaats", na."Straatnaam") r
        ) as selectieadressen
    from (select distinct "DBK_ID" from wfs."AdresDBKneven") t;
comment on view viewer.viewer_object_selectieadressen is 'View met gecomprimeerde JSON selectieadressen per DBK';    
    
create or replace view viewer.viewer_object_map as
    select * from (
        select 
            vo.id,
            oms_nummer,
            formele_naam,
            informele_naam,
            symbool,
        
            --st_astext(pand.pand_centroid) as pand_centroid,
            -- ipv st_collect() zou st_extent() ook kunnen
            (select st_astext(st_centroid(st_collect(the_geom))) from wfs."Polygon" where "DBK_ID" = vo.id) as pand_centroid,
            st_astext(selectiekader.the_geom) as selectiekader,
            st_astext(st_centroid(selectiekader.the_geom)) as selectiekader_centroid,
            (select st_extent(the_geom)::varchar from (
                select the_geom from wfs."Gebied" where "DBK_ID" = vo.id
                union all select the_geom from wfs."Polygon" where "DBK_ID" = vo.id
                union all select the_geom from wfs."Brandweervoorziening" where "DBK_ID" = vo.id
                union all select the_geom from wfs."Custom_Polygon" where "DBK_ID" = vo.id
                -- ignore, sometimes outside screen due to unintended edits
                --union all select the_geom from wfs."Hulplijn" where "DBK_ID" = vo.id
                union all select the_geom from wfs."ToegangTerrein" where "DBK_ID" = vo.id
                -- Geen AfwijkendeBinnendekking, Brandcompartiment of GevaarlijkeStof (vaak binnen pand)
            ) e) as extent,

            -- Adres
            a."Straatnaam" as straatnaam,
            a."Huisnummer" as huisnummer,
            a."Huisletter" as huisletter,
            a."Toevoeging" as toevoeging,
            a."Postcode" as postcode,
            a."Plaats" as plaats/*,
            
            -- AdresDBKneven
            -- Wordt erg traag terwijl losse view wel snel is, verplaats naar Java code ViewerDataExporter.getViewerObjectMapOverview()
            sa.selectieadressen as selectieadressen,
            
            -- Wordt erg traag, verplaatst naar Java code ViewerDataExporter.getViewerObjectMapOverview()
            coalesce((select true from viewer.viewer_object where hoofdobject_id = vo.id limit 1),false) as heeft_verdiepingen*/
            
        from viewer.viewer_object vo
        left join wfs."Adres" a on (a."Adres_ID" = vo.adres_id)
        --left join (select "DBK_ID", st_centroid(st_collect(the_geom)) as pand_centroid from wfs."Polygon" group by "DBK_ID") pand on (pand."DBK_ID" = vo.id)
        left join wfs."Gebied" selectiekader on (selectiekader."DBK_ID" = vo.id)
        left join viewer.viewer_object_selectieadressen sa on (sa.id = vo.id)
        where 
	    -- alleen hoofdobjecten, geen verdiepingen
        vo.hoofdobject_id is null 
    ) r
    where 
        -- alleen objecten die op kaart kunnen worden geplaatst
        coalesce(pand_centroid, selectiekader_centroid) is not null
	order by formele_naam;
comment on view viewer.viewer_object_map is 'View met informatie objecten voor in de opstartkaart van de viewer';        

create or replace view viewer.viewer_object_details as
    select 
        vo.*,
        
        -- Adres (herhaal ipv baseren op viewer_object_map indien verdieping en geen hoofdobject)
        a."Straatnaam" as straatnaam,
        a."Huisnummer" as huisnummer,
        a."Huisletter" as huisletter,
        a."Toevoeging" as toevoeging,
        a."Postcode" as postcode,
        a."Plaats" as plaats,

        (select "Gebouwconstructie" from wfs."Object" where "DBK_ID" = vo.id limit 1) as gebouwconstructie,

        -- 0..n properties zonder geometrie
        
        -- Verdiepingen:        
        -- NULL indien dit hoofdobject is en er geen verdiepingen zijn
        case when (vo.hoofdobject_id is null and (select count(*) from viewer.viewer_object vov where vov.hoofdobject_id = vo.id) = 0) then null
        else 
        -- Alle verdiepingen inclusief hoofdobject (dus ook huidige row nogmaals)
            (select array_to_json(array_agg(row_to_json(r.*)))
            from (select id, bouwlaag, formele_naam, informele_naam, hoofdobject_id is null as is_hoofdobject
                    from viewer.viewer_object vov
                    where vov.id in (vo.id, vo.hoofdobject_id)
                    or vov.hoofdobject_id in (vo.id, vo.hoofdobject_id)
                    order by bouwlaag) r
            )
        end as verdiepingen,
            
        -- AantalPersonen
        (select array_to_json(array_agg(row_to_json(r.*)))
        from (select ap."TypeGroep" as groep, ap."Aantal" as aantal, ap."AantalNZR" as aantal_nzr, ap."Begintijd" as begintijd, ap."Eindtijd" AS eindtijd,
                ap.maandag, ap.dinsdag, ap.woensdag, ap.donderdag, ap.vrijdag, ap.zaterdag, ap.zondag
            from wfs."AantalPersonen" ap                
            where ap."DBK_ID" = vo.id) r
        ) as verblijf,
        
        -- Bijzonderheid
        (select array_to_json(array_agg(row_to_json(r.*))) as array_to_json
        from (select "Soort" as soort, "Tekst" as tekst, "Tabblad" as tabblad, "Seq" as seq
            from wfs."Bijzonderheid" where "DBK_ID" = vo.id
            order by "Seq" asc) r
        ) as bijzonderhedenlijst,
        
        -- Contact
        (select array_to_json(array_agg(row_to_json(r.*))) as array_to_json
        from (select "Functie" as functie, "Naam" as naam, "Telefoonnummer" as telefoonnummer
            from wfs."Contact" where "DBK_ID" = vo.id) r
        ) as contacten,
        
        -- Foto
        (select array_to_json(array_agg(row_to_json(r.*))) as array_to_json
        from (select case when "Bestandstype" = 'Weblink' then '' else "DBK_ID" || '-' end || "Documentnaam" as filename, "Bestandstype" as type
            from wfs."Foto" where "DBK_ID" = vo.id
            union
            select "Picturename" as filename, 'picture' as type from wfs."Brandweervoorziening" where "Picturename" <> '' and "DBK_ID" = vo.id) r
        ) as media,        
        
        -- 0..n properties met geometrie

        -- AfwijkendeBinnendekking
        (select array_to_json(array_agg(row_to_json(r.*))) as array_to_json
        from (select "AlternatiefComm" as alternatief, "Dekking" as dekking, "Aanvullendeinformatie" as aanvullende_informatie, st_astext(the_geom) as location
            from wfs."AfwijkendeBinnendekking" where "DBK_ID" = vo.id and the_geom is not null) r
        ) as communication_coverage,
        
        -- Brandweervoorziening
        (select array_to_json(array_agg(row_to_json(r.*))) as array_to_json
        from (select "Code" as code, "Rotatie" as rotation, "Omschrijving" as omschrijving, "Picturename" as picture, st_astext(the_geom) as location
            from wfs."Brandweervoorziening" where "DBK_ID" = vo.id and the_geom is not null) r
        ) as symbols,

        -- Brandcompartiment
        (select array_to_json(array_agg(row_to_json(r.*))) as array_to_json
        from (select "Soort" as style, "Omschrijving" as omschrijving, "Label" as label, st_astext(the_geom) as line
            from wfs."Brandcompartiment" where "DBK_ID" = vo.id and the_geom is not null) r
        ) as fire_compartmentation,
        
        -- Gebied
        (select st_astext(the_geom) from wfs."Gebied" where "DBK_ID" = vo.id and the_geom is not null limit 1) as select_area,

        -- Custom_Polygon
        (select array_to_json(array_agg(row_to_json(r.*))) as array_to_json
        from (select "Soort" as style, "Omschrijving" as omschrijving, st_astext(the_geom) as polygon
            from wfs."Custom_Polygon" 
            left join wfs.type_custom_polygon t on (t.code = "Soort") -- left join voor soort, onbekende soort komt ook mee
            where "DBK_ID" = vo.id and the_geom is not null
            order by t.sort_order) r
        ) as custom_polygons,      
        
        -- GevaarlijkeStof
        (select array_to_json(array_agg(row_to_json(r.*))) as array_to_json
        from (select "Omschrijving" as omschrijving, "Symbol" as symbol, "GEVIcode" as gevi_code, "UNnr" as un_nr, "Hoeveelheid" as hoeveelheid, "NaamStof" as naam_stof, st_astext(the_geom) as location
            from wfs."GevaarlijkeStof" where "DBK_ID" = vo.id and the_geom is not null) r
        ) as danger_symbols,
        
        -- Hulplijn
        (select array_to_json(array_agg(row_to_json(r.*))) as array_to_json
        from (select "Type" as style, "Omschrijving" as omschrijving, st_astext(the_geom) as line
            from wfs."Hulplijn" where "DBK_ID" = vo.id and the_geom is not null) r
        ) as lines,        
        
        -- Polygon
        (select array_to_json(array_agg(st_astext(the_geom))) from wfs."Polygon" where "DBK_ID" = vo.id and the_geom is not null) as buildings, 
        
        -- TekstObject
        (select array_to_json(array_agg(row_to_json(r.*))) as array_to_json
        from (select "Tekst" as text, "Rotatie" as rotation, "LabelSize" as size, st_astext(the_geom) as location
            from wfs."TekstObject" where "DBK_ID" = vo.id and the_geom is not null) r
        ) as labels,         
        
        -- ToegangTerrein    
        (select array_to_json(array_agg(row_to_json(r.*))) as array_to_json
        from (select "Primair" as style, "NaamRoute" as naam, "Omschrijving" as omschrijving, st_astext(the_geom) as line
            from wfs."ToegangTerrein" where "DBK_ID" = vo.id and the_geom is not null) r
        ) as approach_routes            
        
    from viewer.viewer_object vo
    left join wfs."Adres" a on (a."Adres_ID" = vo.adres_id);
comment on view viewer.viewer_object_details is 'View met alle JSON data van geselecteerd object die in viewer getoond wordt';

-- views voor geoserver, onderstaande volgorde is ook rendervolgorde: polygons, lines, points, labels
-- XXX geen nummer in naam indien er een tussenkomt?

create or replace view viewer.layer_buildings as 
    select vo.id, the_geom as polygon
    from viewer.viewer_object vo
    join wfs."Polygon" on ("DBK_ID" = vo.id);
    
create or replace view viewer.layer_custom_polygons as     
    select vo.id, the_geom as polygon, t.color, t.opacity
    from viewer.viewer_object vo
    join wfs."Custom_Polygon" on ("DBK_ID" = vo.id)
    left join wfs.type_custom_polygon t on (t.code = "Soort") -- left join voor soort, onbekende soort komt ook mee
    order by t.sort_order;

-- Alle lijnen lagen hebben dezelfde kolommen voor dezelfde SLD

create or replace view viewer.layer_fire_compartmentation as
    select vo.id, the_geom as line, t.code, t.thickness, t.color as color1, null::varchar as color2, t.type_viewer as style, t.pattern
    from viewer.viewer_object vo
    join wfs."Brandcompartiment" on ("DBK_ID" = vo.id)
    left join wfs.type_compartment t on (t.code = "Soort"); -- left join voor soort, onbekende soort komt ook mee

create or replace view viewer.layer_lines as
    select vo.id, the_geom as line, t.code, t.thickness, t.color1, t.color2, t.type_viewer as style, t.pattern
    from viewer.viewer_object vo
    join wfs."Hulplijn" on ("DBK_ID" = vo.id)
    left join wfs.type_custom_line t on (t.code = "Type"); -- left join voor soort, onbekende soort komt ook mee
    
create or replace view viewer.layer_approach_routes as 
    select vo.id, the_geom as line, 'route'::varchar as code, 2 as thickness, case when "Primair" = 1 then '#ff0000'::varchar else '#0000ff'::varchar end as color1, null::varchar as color2, 'arrow'::varchar as style, ''::varchar as pattern
    from viewer.viewer_object vo
    join wfs."ToegangTerrein" on ("DBK_ID" = vo.id);

-- Puntlagen

create or replace view viewer.layer_communication_coverage as
    select vo.id, the_geom as location, "Dekking" as coverage, 0 as rotation
    from viewer.viewer_object vo
    join wfs."AfwijkendeBinnendekking" on ("DBK_ID" = vo.id);
    
-- TODO SLD genereren (ook met API stijl in GeoServer laden?) or alle files in dezelfde dir?
-- TODO met PNG of is soms SVG extensie mooier
-- TODO size is afhankelijk van symbool

create or replace view viewer.layer_symbols as
    select vo.id, the_geom as location, "Code" as symbol, "Rotatie" as rotation
    from viewer.viewer_object vo
    join wfs."Brandweervoorziening" on ("DBK_ID" = vo.id);

create or replace view viewer.layer_danger_symbols as
    select vo.id, the_geom as location, "Symbol" as symbol, 0::integer as rotation
    from viewer.viewer_object vo
    join wfs."GevaarlijkeStof" on ("DBK_ID" = vo.id);

-- Label laag

create or replace view viewer.layer_labels as
    select vo.id, the_geom as location, "Tekst" as text, "Rotatie" as rotation, "LabelSize" as size
    from viewer.viewer_object vo
    join wfs."TekstObject" on ("DBK_ID" = vo.id);
