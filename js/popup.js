var STORAGE_FLAG = "my_table_maker";
var KEY_REPLACE = "{ID}";
var DATA_TEMPLATE = {
    "table_name": "万能表格",
    "data_url": "http://",
    "data_type": "json",
    "keys": [],
    "fields": [],
}

// 获取数据存储
function get_my_table_maker(callback) {
    chrome.storage.local.get([STORAGE_FLAG], function(res) {
        if (callback) callback(res[STORAGE_FLAG])
    })
}

// 设置数据存储
function set_my_table_maker(new_table, callback) {
    chrome.storage.local.set({ "my_table_maker": new_table }, function() {
        if (callback) callback()
    })
}

function key_replace(url, key) {
    return url.replace(KEY_REPLACE, key);
}

async function deal_json_parser(url, key, fields) {
    return await fetch(key_replace(url, key))
        .then(response => response.json())
        .then(data => {
            rowdata = [key];
            for (i in fields) {
                tmpdata = data;
                fields[i]["data_parser"].split(".").map(fieldkey => {
                    tmpdata = tmpdata[fieldkey];
                })
                if (Object.prototype.toString.call(tmpdata) === '[object Object]') {
                    rowdata.push(JSON.stringify(tmpdata));
                } else {
                    rowdata.push(tmpdata || "");
                }
            }
            return rowdata;
        });
}

async function deal_text_parser(url, key, fields) {
    return await fetch(key_replace(url, key))
        .then(res => res.text())
        .then(data => {
            rowdata = [key];
            for (i in fields) {
                rowdata.push(data.match(new RegExp(fields[i]["data_parser"]))[1]);
            }
            return rowdata;
        });
}

async function render(data) {
    $(".mainbody").html("");
    $(".table_head").html(data["table_name"]);
    headstr = "<tr>";
    headstr += "<td>主键</td>"
    data["fields"].map(field => headstr += "<td>" + field["field_name"] + "</td>");
    headstr += "<td>操作</td></tr>";
    $(".mainhead").html(headstr);
    for (key in data["keys"]) {
        let row;
        try {
            if (data["data_type"] === "json") {
                row = await deal_json_parser(data["data_url"], data["keys"][key], data["fields"]);
            } else {
                row = await deal_text_parser(data["data_url"], data["keys"][key], data["fields"]);
            }
        } catch (e) {
            row = [data["keys"][key]];
            data["fields"].map(field => row.push(""));
        }
        htmlstr = "<tr>";
        row.map(value => htmlstr += "<td>" + value + "</td>");
        htmlstr += "<td><a href='#' id='move_up' key='" + key + "'>上移</a> <a href='#' id='delete_value' key='" + key + "'>删除</a></td>"
        htmlstr += "</tr>";
        $(".mainbody").append(htmlstr);
    }
}

async function test_parser(data, key, parser) {
    let test_fields = [{
        "field_name": "test",
        "data_parser": parser
    }]
    let row;
    if (data["data_type"] === "json") {
        row = await deal_json_parser(data["data_url"], key, test_fields);
    } else {
        row = await deal_text_parser(data["data_url"], key, test_fields);
    }
    console.log(row);
    $("#test_parser_result").html(row[1]);
}

function render_fields(fields) {
    let htmlstr = "";
    for (i in fields) {
        htmlstr += "<tr><td>" + fields[i]["field_name"] + "</td><td><XMP>" +
            fields[i]["data_parser"] + "</XMP></td><td id='opera_field'>" +
            "<a href='#' id='moveup_field' key='" + i + "'>上移</a> " +
            "<a href='#' id='edit_field' key='" + i + "'>编辑</a> " +
            "<a href='#' id='delete_field' key='" + i + "'>删除</a>" +
            "</td></tr>"
    }
    console.log(htmlstr);
    $("#fields_tbody").html(htmlstr);
}


$(document).ready(function() {

    var EDIT_FIELD = undefined;

    $("select").material_select();
    $('.modal').modal();

    get_my_table_maker(my_table_maker => {
        if (my_table_maker == undefined) {
            set_my_table_maker(DATA_TEMPLATE);
            render(DATA_TEMPLATE);
        } else {
            render(my_table_maker);
        }
    })

    $("#submit-table-info").click(function() {
        get_my_table_maker(my_table_maker => {
            my_table_maker["data_url"] = $("#datasource_url").val();
            my_table_maker["data_type"] = $(".select-dropdown").val();
            my_table_maker["table_name"] = $("#table_name").val();
            set_my_table_maker(my_table_maker);
            render_fields(my_table_maker["fields"]);
        })
        $("#set-field").show();
        $("#set-table").hide();
    });

    $("#edit-table-btn").click(function() {
        $("#main").hide();
        $("#set-table").show();
        get_my_table_maker(my_table_maker => {
            $("#datasource_url").val(my_table_maker["data_url"]);
            $(".select-dropdown").val(my_table_maker["data_type"]);
            $("#table_name").val(my_table_maker["table_name"]);
            Materialize.updateTextFields();
        })
    })

    $("#add_key").click(function() {
        if ($("#keys_input").val().length > 0) {
            get_my_table_maker(my_table_maker => {
                my_table_maker["keys"] = my_table_maker["keys"].concat($("#keys_input").val().split(","));
                set_my_table_maker(my_table_maker);
                render(my_table_maker);
            })
        }
    })

    $(".return-main").click(function() {
        $("#set-field").hide();
        $("#set-table").hide();
        $("#main").show();
        get_my_table_maker(my_table_maker => {
            render(my_table_maker);
        })
    })

    $("#add_field").click(function() {
        if ($("#field_name").val().length == 0 || $("parse_format").val() == 0) {
            alert("输入不能为空");
        }
        get_my_table_maker(my_table_maker => {
            if (EDIT_FIELD == undefined) {
                my_table_maker["fields"].push({
                    "field_name": $("#field_name").val(),
                    "data_parser": $("#parse_format").val()
                })
            } else {
                my_table_maker["fields"][EDIT_FIELD]["field_name"] = $("#field_name").val();
                my_table_maker["fields"][EDIT_FIELD]["data_parser"] = $("#parse_format").val();
            }
            set_my_table_maker(my_table_maker);
            render_fields(my_table_maker["fields"]);
        })

    })

    $("#add_field_btn").click(function() {
        EDIT_FIELD = undefined;
        get_my_table_maker(my_table_maker => {
            if (my_table_maker["data_type"] == "json") {
                $("#parse_format_label").html("解析方式:key.key.key");
            } else {
                $("#parse_format_label").html("解析方式:正则");
            }
        })
    })

    $("#fields_tbody").on("click", "#delete_field", function() {
        get_my_table_maker(my_table_maker => {
            my_table_maker["fields"].splice(parseInt($(this).attr("key")), 1);
            set_my_table_maker(my_table_maker);
            render_fields(my_table_maker["fields"]);
        })
    })

    $("#test_parser").bind('keypress', function(event) {
        if (event.keyCode == "13") {
            get_my_table_maker(my_table_maker => {
                test_parser(my_table_maker, $("#test_id").val(), $(this).val())[1];
            })
        }
    });

    $("#fields_tbody").on("click", "#edit_field", function() {
        EDIT_FIELD = parseInt($(this).attr("key"));
        get_my_table_maker(my_table_maker => {
            $("#field_name").val(my_table_maker["fields"][EDIT_FIELD]["field_name"]);
            $("#parse_format").val(my_table_maker["fields"][EDIT_FIELD]["data_parser"]);
            $("#modal1").modal("open");
            Materialize.updateTextFields();
        })
    })

    $("#fields_tbody").on("click", "#moveup_field", function() {
        let index = parseInt($(this).attr("key"));
        if (index > 0) {
            get_my_table_maker(my_table_maker => {
                tmp = my_table_maker["fields"][index - 1];
                my_table_maker["fields"][index - 1] = my_table_maker["fields"][index];
                my_table_maker["fields"][index] = tmp;
                set_my_table_maker(my_table_maker);
                render_fields(my_table_maker["fields"]);
            })
        }
    })

    $(".mainbody").on("click", "#delete_value", function() {
        get_my_table_maker(my_table_maker => {
            my_table_maker["keys"].splice(parseInt($(this).attr("key")), 1);
            set_my_table_maker(my_table_maker);
            render(my_table_maker);
        })
    })

    $(".mainbody").on("click", "#move_up", function() {
        let index = parseInt($(this).attr("key"));
        if (index > 0) {
            get_my_table_maker(my_table_maker => {
                tmp = my_table_maker["keys"][index - 1];
                my_table_maker["keys"][index - 1] = my_table_maker["keys"][index];
                my_table_maker["keys"][index] = tmp;
                set_my_table_maker(my_table_maker);
                render(my_table_maker);
            })
        }
    })

    $("#test_parser_btn").click(function() {
        get_my_table_maker(my_table_maker => {
            if (my_table_maker["data_type"] == "json") {
                $("#test_parser_label").html("解析方式:key.key.key");
            } else {
                $("#test_parser_label").html("解析方式:正则");
            }
        })
    })

    $("#demo_import").click(function() {
        let demo_data = {
            "data_type": "text",
            "data_url": "http://fund.eastmoney.com/{ID}.html",
            "fields": [{
                    "data_parser": 'funCur-FundName">(.*?)</span>',
                    "field_name": "基金名称"
                },
                {
                    "data_parser": 'gz_gszzl">(.*?)</span>',
                    "field_name": "净值估算"
                }
            ],
            "keys": ["110022", "160419", "003634"],
            "table_name": "default"
        }
        set_my_table_maker(demo_data);
        render(demo_data);
    })

    $("#new_table_data").change(function() {
        set_my_table_maker(JSON.parse($(this).val()));
        get_my_table_maker(my_table_maker => {
            render(my_table_maker);
            $("#modal3").modal("close");
        })
    })

    $("#export_data").click(function() {
        get_my_table_maker(my_table_maker => {
            $(this).attr("data-clipboard-text", JSON.stringify(my_table_maker));
            new ClipboardJS('#export_data');
        })
    })
});