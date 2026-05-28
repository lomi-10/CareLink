<?php
/**
 * mysqli_stmt helpers for servers without mysqlnd (get_result unavailable).
 */

/**
 * @return array<string,mixed>|null
 */
function carelink_mysqli_stmt_fetch_assoc(mysqli_stmt $stmt): ?array
{
    $meta = $stmt->result_metadata();
    if (!$meta) {
        return null;
    }
    $fields = $meta->fetch_fields();
    $row = [];
    $bind = [];
    foreach ($fields as $f) {
        $name = $f->name;
        $row[$name] = null;
        $bind[] = &$row[$name];
    }
    call_user_func_array([$stmt, 'bind_result'], $bind);
    $ok = $stmt->fetch();
    $meta->free();
    if (!$ok) {
        return null;
    }
    return $row;
}

/**
 * @return array<int, array<string,mixed>>
 */
function carelink_mysqli_stmt_fetch_all_assoc(mysqli_stmt $stmt): array
{
    $res = $stmt->get_result();
    if ($res instanceof mysqli_result) {
        $rows = [];
        while ($r = $res->fetch_assoc()) {
            $rows[] = $r;
        }
        $res->free();
        return $rows;
    }

    $meta = $stmt->result_metadata();
    if (!$meta) {
        return [];
    }
    $fields = $meta->fetch_fields();
    $row = [];
    $bind = [];
    foreach ($fields as $f) {
        $name = $f->name;
        $row[$name] = null;
        $bind[] = &$row[$name];
    }
    call_user_func_array([$stmt, 'bind_result'], $bind);
    $out = [];
    while ($stmt->fetch()) {
        $copy = [];
        foreach ($row as $k => $v) {
            $copy[$k] = $v;
        }
        $out[] = $copy;
    }
    $meta->free();

    return $out;
}
