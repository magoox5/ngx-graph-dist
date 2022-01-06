export function calculateViewDimensions({ width, height }) {
    let chartWidth = width;
    let chartHeight = height;
    chartWidth = Math.max(0, chartWidth);
    chartHeight = Math.max(0, chartHeight);
    return {
        width: Math.floor(chartWidth),
        height: Math.floor(chartHeight)
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlldy1kaW1lbnNpb25zLmhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3N3aW1sYW5lL25neC1ncmFwaC9zcmMvbGliL3V0aWxzL3ZpZXctZGltZW5zaW9ucy5oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBS0EsTUFBTSxVQUFVLHVCQUF1QixDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRTtJQUN2RCxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7SUFDdkIsSUFBSSxXQUFXLEdBQUcsTUFBTSxDQUFDO0lBRXpCLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNyQyxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFFdkMsT0FBTztRQUNMLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQztRQUM3QixNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUM7S0FDaEMsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgaW50ZXJmYWNlIFZpZXdEaW1lbnNpb25zIHtcbiAgd2lkdGg6IG51bWJlcjtcbiAgaGVpZ2h0OiBudW1iZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxjdWxhdGVWaWV3RGltZW5zaW9ucyh7IHdpZHRoLCBoZWlnaHQgfSk6IFZpZXdEaW1lbnNpb25zIHtcbiAgbGV0IGNoYXJ0V2lkdGggPSB3aWR0aDtcbiAgbGV0IGNoYXJ0SGVpZ2h0ID0gaGVpZ2h0O1xuXG4gIGNoYXJ0V2lkdGggPSBNYXRoLm1heCgwLCBjaGFydFdpZHRoKTtcbiAgY2hhcnRIZWlnaHQgPSBNYXRoLm1heCgwLCBjaGFydEhlaWdodCk7XG5cbiAgcmV0dXJuIHtcbiAgICB3aWR0aDogTWF0aC5mbG9vcihjaGFydFdpZHRoKSxcbiAgICBoZWlnaHQ6IE1hdGguZmxvb3IoY2hhcnRIZWlnaHQpXG4gIH07XG59XG4iXX0=